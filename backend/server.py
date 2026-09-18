from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Query, Response, Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import csv
import re
import json
import time
import base64
import logging
import requests
from collections import deque
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta, date

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

class NoDatabase:
    """Fake DB que responde 503 si se usan rutas de datos sin MongoDB."""

    def __getattr__(self, _name):
        raise HTTPException(status_code=503, detail="Backend configurado solo para OCR (sin base de datos)")

# MongoDB (opcional: solo para el modo API completo. El modo OCR-only no lo necesita)
mongo_url = os.environ.get("MONGO_URL") or ""
if mongo_url:
    _mongo_client = AsyncIOMotorClient(mongo_url)
    db = _mongo_client[os.environ.get("DB_NAME", "gastocontrol")]
else:
    _mongo_client = None
    db = NoDatabase()

# Storage
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
# OCR alternativo: Gemini directo vía endpoint OpenAI-compatible de Google
# (key gratuita de https://aistudio.google.com). Si GEMINI_API_KEY está definida,
# se usa Gemini en lugar del proxy de Emergent para el LLM. El storage sigue en Emergent.
GEMINI_API_KEY = (os.environ.get("GEMINI_API_KEY") or "").strip()
GEMINI_MODEL = (os.environ.get("GEMINI_MODEL") or "gemini-2.5-flash").strip()
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
APP_NAME = "gastocontrol"

# --- Endurecimiento de la API ---
# Tamaño máximo de subida para el OCR (protege memoria/cuota).
MAX_UPLOAD_BYTES = int((os.environ.get("MAX_UPLOAD_BYTES") or str(8 * 1024 * 1024)).strip())
# Clave opcional: si se define APP_API_KEY, los endpoints de OCR/ficheros exigen la
# cabecera `X-App-Key`. Vacío = abierto (comportamiento actual).
APP_API_KEY = (os.environ.get("APP_API_KEY") or "").strip()
# Límite de peticiones por minuto y por IP en /receipts/scan y /files (0 = desactivado).
OCR_RATE_LIMIT = int((os.environ.get("OCR_RATE_LIMIT") or "30").strip())
ALLOWED_IMAGE_EXTS = {"jpg", "jpeg", "png", "webp", "heic", "heif"}

storage_key = None

_hits: dict = {}

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


def _client_ip(request: Request) -> str:
    # Apache actúa de proxy en 127.0.0.1; confiamos en X-Forwarded-For solo como
    # pista (no para seguridad), y usamos la IP de la conexión como clave.
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _rate_limit(request: Request):
    if OCR_RATE_LIMIT <= 0:
        return
    ip = _client_ip(request)
    now = time.time()
    dq = _hits.get(ip)
    if dq is None:
        dq = deque()
        _hits[ip] = dq
    while dq and now - dq[0] > 60:
        dq.popleft()
    if len(dq) >= OCR_RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Demasiadas peticiones; inténtalo en un minuto")
    dq.append(now)
    # Evita crecimiento ilimitado del mapa en un ataque distribuido.
    if len(_hits) > 5000:
        for k in [k for k, v in _hits.items() if not v][:1000]:
            _hits.pop(k, None)


def _require_api_key(request: Request):
    if not APP_API_KEY:
        return
    if request.headers.get("x-app-key") != APP_API_KEY:
        raise HTTPException(status_code=401, detail="No autorizado")


def _reject_bad_path(path: str):
    if not path or path.startswith("/") or ".." in path or "\x00" in path:
        raise HTTPException(status_code=400, detail="Ruta no válida")


CSV_FORMULA_PREFIX = ("=", "+", "-", "@", "\t", "\r")


def _csv_safe(value) -> str:
    """Evita inyección de fórmulas al abrir el CSV en Excel/LibreOffice."""
    s = str(value if value is not None else "")
    if s and s[0] in CSV_FORMULA_PREFIX:
        return "'" + s
    return s


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key}, timeout=60,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# App
app = FastAPI()
api_router = APIRouter(prefix="/api")


CATEGORIES = ["General", "Compras", "Facturas", "Otros"]

DEFAULT_CATEGORIES = [
    {"name": "General", "icon": "Package", "color": "indigo"},
    {"name": "Compras", "icon": "ShoppingCart", "color": "orange"},
    {"name": "Facturas", "icon": "FileText", "color": "blue"},
    {"name": "Otros", "icon": "MoreHorizontal", "color": "stone"},
]

ALLOWED_ICONS = [
    "Hammer", "Wrench", "FileText", "Users", "Truck", "MoreHorizontal",
    "Paintbrush", "Zap", "Home", "Package", "ShoppingCart", "Trees",
    "Droplet", "Flame", "Bolt", "Lightbulb", "PiggyBank", "Sparkles",
]
ALLOWED_COLORS = [
    "orange", "amber", "blue", "emerald", "purple", "stone",
    "rose", "cyan", "indigo", "lime", "teal", "pink",
]


async def get_category_names(project: Optional[str] = None):
    if _mongo_client is None:
        return CATEGORIES
    proj = (project or "").strip()
    if proj:
        query = {"project": proj}
    else:
        query = {"$or": [{"project": ""}, {"project": {"$exists": False}}]}
    docs = await db.categories.find(query, {"_id": 0}).to_list(500)
    if not docs:
        if proj:
            rows = [{**dict(c), "project": proj} for c in DEFAULT_CATEGORIES]
            try:
                await db.categories.insert_many(rows)
            except Exception:
                pass
        return CATEGORIES
    return [d["name"] for d in docs] or CATEGORIES

# Models
class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor: str = ""
    date: str  # ISO date YYYY-MM-DD
    amount: float
    category: str = "Otros"
    project: str = ""
    notes: str = ""
    items: List[dict] = Field(default_factory=list)
    receipts: List[dict] = Field(default_factory=list)
    receipt_path: Optional[str] = None  # storage path
    receipt_url: Optional[str] = None   # backend URL to fetch
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ExpenseCreate(BaseModel):
    vendor: str = ""
    date: str
    amount: float
    category: str = "Otros"
    project: str = ""
    notes: str = ""
    items: List[dict] = Field(default_factory=list)
    receipts: List[dict] = Field(default_factory=list)
    receipt_path: Optional[str] = None
    receipt_url: Optional[str] = None


class ExpenseUpdate(BaseModel):
    vendor: Optional[str] = None
    date: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    project: Optional[str] = None
    notes: Optional[str] = None
    items: Optional[List[dict]] = None
    receipts: Optional[List[dict]] = None


class Budget(BaseModel):
    total: float = 0.0
    alert_at: float = 80.0
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    category_budgets: dict = Field(default_factory=dict)
    project_budgets: dict = Field(default_factory=dict)
    period: str = "monthly"


class BudgetUpdate(BaseModel):
    total: float
    alert_at: Optional[float] = None
    category_budgets: Optional[dict] = None
    project_budgets: Optional[dict] = None
    period: Optional[str] = None


PERIODS = ("weekly", "monthly", "yearly")


def period_range(period: Optional[str]):
    p = period if period in PERIODS else "monthly"
    today = datetime.now(timezone.utc).date()
    if p == "weekly":
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
        label = "semana"
    elif p == "yearly":
        start = today.replace(month=1, day=1)
        end = today.replace(month=12, day=31)
        label = "año"
    else:
        start = today.replace(day=1)
        next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
        end = next_month - timedelta(days=1)
        label = "mes"
    days = (end - start).days + 1
    elapsed = min(max((today - start).days + 1, 1), days)
    return {
        "period": p,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "label": label,
        "days": days,
        "elapsed": elapsed,
    }


def sanitize_category_budgets(raw):
    out = {}
    if isinstance(raw, dict):
        for name, value in raw.items():
            try:
                v = float(value)
            except (TypeError, ValueError):
                continue
            if v >= 0:
                out[name] = round(v, 2)
    return out


class Category(BaseModel):
    name: str
    icon: str = "MoreHorizontal"
    color: str = "stone"


class CategoryCreate(BaseModel):
    name: str
    icon: Optional[str] = "MoreHorizontal"
    color: Optional[str] = "stone"
    project: Optional[str] = ""


class ProjectRename(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    from_name: str = Field(alias="from")
    to: str

# Startup
@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    # Seed default categories if empty (solo con MongoDB)
    if _mongo_client is not None:
        try:
            count = await db.categories.count_documents({})
            if count == 0:
                await db.categories.insert_many([{**dict(c), "project": ""} for c in DEFAULT_CATEGORIES])
                logger.info("Seeded default categories")
        except Exception as e:
            logger.error(f"Seed categories failed: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    if _mongo_client is not None:
        _mongo_client.close()


# --- Routes ---
@api_router.get("/")
async def root():
    return {"message": "GastoControl API", "categories": CATEGORIES}


@api_router.get("/categories")
async def get_categories(project: Optional[str] = None):
    proj = (project or "").strip()
    if proj:
        query = {"project": proj}
    else:
        query = {"$or": [{"project": ""}, {"project": {"$exists": False}}]}
    docs = await db.categories.find(query, {"_id": 0}).to_list(500)
    if not docs:
        if proj:
            try:
                await db.categories.insert_many(
                    [{**dict(c), "project": proj} for c in DEFAULT_CATEGORIES]
                )
            except Exception:
                pass
        return {"categories": [dict(c) for c in DEFAULT_CATEGORIES]}
    # Return in insertion order but always ensure "Otros" is last if present
    docs_sorted = sorted(docs, key=lambda d: (d["name"] == "Otros", d["name"]))
    return {"categories": docs_sorted}


@api_router.post("/categories", response_model=Category)
async def create_category(payload: CategoryCreate):
    name = (payload.name or "").strip()
    project = (payload.project or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre no puede estar vacío")
    if len(name) > 40:
        raise HTTPException(status_code=400, detail="Nombre demasiado largo (máx 40)")
    if project:
        query = {"name": name, "project": project}
    else:
        query = {"name": name, "$or": [{"project": ""}, {"project": {"$exists": False}}]}
    existing = await db.categories.find_one(query)
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe una categoría con ese nombre")
    icon = payload.icon if payload.icon in ALLOWED_ICONS else "MoreHorizontal"
    color = payload.color if payload.color in ALLOWED_COLORS else "stone"
    doc = {"name": name, "icon": icon, "color": color, "project": project}
    await db.categories.insert_one(doc)
    return Category(**{"name": name, "icon": icon, "color": color})


@api_router.delete("/categories/{name}")
async def delete_category(name: str, project: Optional[str] = None):
    if name == "Otros":
        raise HTTPException(status_code=400, detail="La categoría 'Otros' no se puede borrar")
    proj = (project or "").strip()
    expense_q = {"category": name}
    if proj:
        expense_q["project"] = proj
    else:
        expense_q["$or"] = [{"project": ""}, {"project": {"$exists": False}}]
    used = await db.expenses.count_documents(expense_q)
    if used > 0:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede borrar: hay {used} gasto(s) en esta categoría",
        )
    if proj:
        cat_q = {"name": name, "project": proj}
    else:
        cat_q = {"name": name, "$or": [{"project": ""}, {"project": {"$exists": False}}]}
    result = await db.categories.delete_one(cat_q)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return {"ok": True}


# --- Projects ---
@api_router.post("/projects/rename")
async def rename_project(payload: ProjectRename):
    src = (payload.from_name or "").strip()
    dst = (payload.to or "").strip()[:80]
    if not src or not dst:
        raise HTTPException(status_code=400, detail="Nombre inválido")
    if src == dst:
        return {"ok": True, "project": dst, "expenses": 0}

    def exact_ci(value: str):
        return {"$regex": "^" + re.escape(value) + "$", "$options": "i"}

    norm = lambda s: str(s or "").strip().lower()  # noqa: E731

    candidates = await db.expenses.find({"project": exact_ci(dst)}, {"project": 1}).to_list(100)
    clash = any(norm(d.get("project")) == norm(dst) and norm(d.get("project")) != norm(src) for d in candidates)
    if clash:
        raise HTTPException(status_code=409, detail="Ya existe un proyecto con ese nombre")

    res = await db.expenses.update_many({"project": exact_ci(src)}, {"$set": {"project": dst}})

    doc = await db.budget.find_one({"_id": "singleton"}) or {}
    projects = dict(doc.get("projects") or {})
    changed = False
    for k in list(projects.keys()):
        if norm(k) == norm(src) and k != dst:
            projects[dst] = projects.pop(k)
            changed = True
    if changed:
        await db.budget.update_one({"_id": "singleton"}, {"$set": {"projects": projects}})

    try:
        await db.categories.update_many({"project": exact_ci(src)}, {"$set": {"project": dst}})
    except Exception:
        pass
    return {"ok": True, "project": dst, "expenses": res.modified_count}


# --- Expenses CRUD ---
@api_router.post("/expenses", response_model=Expense)
async def create_expense(payload: ExpenseCreate):
    names = await get_category_names(payload.project)
    if payload.category not in names:
        payload.category = "Otros"
    exp = Expense(**payload.model_dump())
    await db.expenses.insert_one(exp.model_dump())
    return exp


@api_router.get("/expenses", response_model=List[Expense])
async def list_expenses(
    category: Optional[str] = None,
    project: Optional[str] = None,
    q: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
):
    query = {}
    if category and category != "all":
        query["category"] = category
    if project and project != "all":
        query["project"] = project
    if start or end:
        date_q = {}
        if start:
            date_q["$gte"] = start
        if end:
            date_q["$lte"] = end
        query["date"] = date_q
    if q:
        query["$or"] = [
            {"vendor": {"$regex": q, "$options": "i"}},
            {"notes": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.expenses.find(query, {"_id": 0}).sort("date", -1).to_list(2000)
    return docs


@api_router.get("/expenses/export")
async def export_expenses():
    docs = await db.expenses.find({}, {"_id": 0}).sort("date", -1).to_list(5000)
    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";")
    writer.writerow(["Fecha", "Proveedor", "Categoría", "Proyecto / Obra", "Importe (€)", "Notas"])
    for d in docs:
        writer.writerow([
            _csv_safe(d.get("date", "")),
            _csv_safe(d.get("vendor", "")),
            _csv_safe(d.get("category", "")),
            _csv_safe(d.get("project", "")),
            f"{float(d.get('amount', 0)):.2f}",
            _csv_safe(d.get("notes", "")),
        ])
    csv_bytes = buf.getvalue().encode("utf-8-sig")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=gastos.csv"},
    )


@api_router.get("/expenses/{expense_id}", response_model=Expense)
async def get_expense(expense_id: str):
    doc = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc


@api_router.patch("/expenses/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, payload: ExpenseUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "category" in updates:
        if "project" not in updates:
            existing = await db.expenses.find_one({"id": expense_id}, {"project": 1})
            updates["project"] = (existing or {}).get("project", "")
        names = await get_category_names(updates.get("project"))
        if updates["category"] not in names:
            updates["category"] = "Otros"
    if updates:
        await db.expenses.update_one({"id": expense_id}, {"$set": updates})
    doc = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc


@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# --- Stats ---
@api_router.get("/stats")
async def get_stats(project: Optional[str] = None):
    query = {}
    project_filter = (project or "").strip()
    if project_filter and project_filter != "all":
        query["project"] = project_filter
    docs = await db.expenses.find(query, {"_id": 0}).to_list(5000)
    total = sum(float(d.get("amount", 0)) for d in docs)
    names = await get_category_names(project_filter)
    by_cat = {c: 0.0 for c in names}
    for d in docs:
        cat = d.get("category", "Otros")
        if cat not in by_cat:
            cat = "Otros"
        by_cat[cat] += float(d.get("amount", 0))
    # monthly breakdown
    monthly = {}
    for d in docs:
        date = d.get("date", "")
        if len(date) >= 7:
            m = date[:7]
            monthly[m] = monthly.get(m, 0) + float(d.get("amount", 0))
    monthly_list = [{"month": k, "total": round(v, 2)} for k, v in sorted(monthly.items())]

    budget_doc = await db.budget.find_one({"_id": "singleton"})
    projects_map = (budget_doc.get("projects") or {}) if budget_doc else {}
    budget_src = projects_map.get(project_filter, {}) if project_filter else (budget_doc or {})
    budget_total = float(budget_src.get("total", 0) or 0)
    budget_alert = float(budget_src.get("alert_at", 80) or 80)
    budget_cat = budget_src.get("category_budgets") or {}
    budget_project = (budget_doc.get("project_budgets") or {}) if budget_doc else {}
    budget_period = budget_src.get("period") or "monthly"
    rng = period_range(budget_period)

    period_docs = [d for d in docs if rng["start"] <= str(d.get("date", "")) <= rng["end"]]
    period_total = sum(float(d.get("amount", 0)) for d in period_docs)
    period_by_cat = {c: 0.0 for c in names}
    for d in period_docs:
        cat = d.get("category", "Otros")
        if cat not in period_by_cat:
            cat = "Otros"
        period_by_cat[cat] += float(d.get("amount", 0))

    return {
        "total_spent": round(total, 2),
        "count": len(docs),
        "budget": budget_total,
        "remaining": round(budget_total - period_total, 2),
        "progress": round((period_total / budget_total * 100) if budget_total > 0 else 0, 2),
        "alert_at": budget_alert,
        "category_budgets": budget_cat,
        "project_budgets": budget_project,
        "by_category": [{"category": k, "total": round(v, 2)} for k, v in by_cat.items()],
        "period": rng["period"],
        "period_label": rng["label"],
        "period_start": rng["start"],
        "period_end": rng["end"],
        "period_days": rng["days"],
        "period_elapsed_days": rng["elapsed"],
        "period_spent": round(period_total, 2),
        "period_by_category": [{"category": k, "total": round(v, 2)} for k, v in period_by_cat.items()],
        "monthly": monthly_list,
    }


# --- Budget ---
@api_router.get("/budget")
async def get_budget(project: Optional[str] = None):
    doc = await db.budget.find_one({"_id": "singleton"}) or {}
    project_filter = (project or "").strip()
    src = (doc.get("projects") or {}).get(project_filter, {}) if project_filter else doc
    return {
        "total": float(src.get("total", 0) or 0),
        "alert_at": float(src.get("alert_at", 80) or 80),
        "updated_at": src.get("updated_at") or doc.get("updated_at"),
        "category_budgets": src.get("category_budgets") or {},
        "project_budgets": doc.get("project_budgets") or {},
        "period": src.get("period") or "monthly",
        "project": project_filter,
    }


@api_router.put("/budget")
async def set_budget(payload: BudgetUpdate):
    now = datetime.now(timezone.utc).isoformat()
    alert = float(payload.alert_at) if payload.alert_at and payload.alert_at > 0 else 80.0
    cb = sanitize_category_budgets(payload.category_budgets)
    pb = sanitize_category_budgets(payload.project_budgets)
    period = payload.period if payload.period in PERIODS else "monthly"
    project_filter = (payload.project or "").strip()
    entry = {
        "total": float(payload.total),
        "alert_at": alert,
        "category_budgets": cb,
        "period": period,
        "updated_at": now,
    }
    doc = await db.budget.find_one({"_id": "singleton"}) or {}
    set_fields = {"project_budgets": pb, "updated_at": now}
    if project_filter:
        projects = dict(doc.get("projects") or {})
        projects[project_filter] = entry
        set_fields["projects"] = projects
    else:
        set_fields.update(entry)
    await db.budget.update_one({"_id": "singleton"}, {"$set": set_fields}, upsert=True)
    if project_filter:
        return {**entry, "project_budgets": pb, "project": project_filter}
    return {**entry, "project_budgets": pb}


# --- Receipt upload & AI extraction ---
def _guess_ext_and_ctype(filename: str, content_type: Optional[str]):
    ext = (filename.split(".")[-1].lower() if "." in filename else "")
    mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}
    if ext in mime_map:
        return ext, mime_map[ext]
    if content_type and content_type.startswith("image/"):
        for e, m in mime_map.items():
            if m == content_type:
                return e, m
    return "jpg", "image/jpeg"


SYSTEM_PROMPT = (
    "Eres un asistente experto en analizar tickets y facturas de compras. "
    "Extrae del ticket la siguiente información y devuélvela SIEMPRE como un JSON válido con estas claves: "
    "vendor (string, nombre del comercio), date (string en formato YYYY-MM-DD, si no se ve usa cadena vacía), "
    "amount (número float, total del ticket en euros), category (uno de: General, Compras, Facturas, Otros), "
    "items (array de objetos con description y price), "
    "notes (string breve). Devuelve SOLO el JSON, sin markdown, sin texto extra."
)


def _parse_extraction(text: str, extracted: dict) -> dict:
    text = str(text or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end + 1]
    parsed = json.loads(text)
    for k in extracted.keys():
        if k in parsed and parsed[k] is not None:
            extracted[k] = parsed[k]
    try:
        extracted["amount"] = float(extracted.get("amount") or 0)
    except Exception:
        extracted["amount"] = 0.0
    return extracted


async def _extract_with_gemini(data: bytes, ctype: str, extracted: dict) -> dict:
    import openai
    b64 = base64.b64encode(data).decode("utf-8")
    mime = ctype if ctype.startswith("image/") else "image/jpeg"
    client = openai.OpenAI(api_key=GEMINI_API_KEY, base_url=GEMINI_BASE_URL)
    completion = client.chat.completions.create(
        model=GEMINI_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analiza este ticket y devuelve el JSON solicitado."},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                ],
            },
        ],
    )
    return _parse_extraction(completion.choices[0].message.content, extracted)


@api_router.post("/receipts/scan")
async def scan_receipt(request: Request, file: UploadFile = File(...)):
    _require_api_key(request)
    _rate_limit(request)

    filename = file.filename or "receipt.jpg"
    ext_guess = (filename.split(".")[-1].lower() if "." in filename else "")
    looks_image = (file.content_type or "").startswith("image/") or ext_guess in ALLOWED_IMAGE_EXTS
    if not looks_image:
        raise HTTPException(status_code=415, detail="Formato no admitido: sube una imagen (JPG, PNG, WEBP)")

    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Imagen demasiado grande (máx {MAX_UPLOAD_BYTES // (1024 * 1024)} MB)",
        )

    ext, ctype = _guess_ext_and_ctype(filename, file.content_type)

    # Upload to storage
    path = f"{APP_NAME}/receipts/{uuid.uuid4()}.{ext}"
    try:
        result = put_object(path, data, ctype)
        stored_path = result["path"]
    except Exception as e:
        logger.error(f"Storage upload failed: {e}")
        raise HTTPException(status_code=500, detail="No se pudo guardar la imagen")

    # Save file reference (opcional: solo con MongoDB)
    if _mongo_client is not None:
        await db.files.insert_one({
            "id": str(uuid.uuid4()),
            "storage_path": stored_path,
            "original_filename": file.filename,
            "content_type": ctype,
            "size": result.get("size", len(data)),
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Analyze with Gemini (directo) o con el proxy de Emergent como fallback
    extracted = {
        "vendor": "",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "amount": 0.0,
        "category": "Otros",
        "items": [],
        "notes": "",
    }
    try:
        if GEMINI_API_KEY:
            extracted = await _extract_with_gemini(data, ctype, extracted)
        elif EMERGENT_KEY:
            b64 = base64.b64encode(data).decode("utf-8")
            chat = LlmChat(
                api_key=EMERGENT_KEY,
                session_id=f"receipt-{uuid.uuid4()}",
                system_message=SYSTEM_PROMPT,
            ).with_model("gemini", "gemini-3.1-pro-preview")

            img = ImageContent(image_base64=b64)
            msg = UserMessage(
                text="Analiza este ticket y devuelve el JSON solicitado.",
                file_contents=[img],
            )
            response = await chat.send_message(msg)
            extracted = _parse_extraction(response, extracted)
        else:
            logger.warning("No AI key configured for extraction (GEMINI_API_KEY / EMERGENT_LLM_KEY)")
        if extracted.get("category") not in await get_category_names():
            extracted["category"] = "Otros"
    except Exception as e:
        logger.error(f"AI extraction failed: {e}")

    return {
        "receipt_path": stored_path,
        "receipt_url": f"/api/files/{stored_path}",
        "extracted": extracted,
    }


@api_router.get("/files/{path:path}")
async def download_file(request: Request, path: str):
    _require_api_key(request)
    _rate_limit(request)
    _reject_bad_path(path)
    record = None
    if _mongo_client is not None:
        record = await db.files.find_one({"storage_path": path, "is_deleted": False})
        if not record:
            raise HTTPException(status_code=404, detail="File not found")
    try:
        data, ctype = get_object(path)
    except Exception as e:
        logger.error(f"Storage fetch error: {e}")
        raise HTTPException(status_code=404, detail="File not found")
    media_type = record.get("content_type", ctype) if record else ctype
    return Response(content=data, media_type=media_type)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
