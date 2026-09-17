from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import csv
import json
import base64
import logging
import requests
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

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
APP_NAME = "gastocontrol"

storage_key = None

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


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


async def get_category_names():
    if _mongo_client is None:
        return CATEGORIES
    docs = await db.categories.find({}, {"_id": 0}).to_list(500)
    return [d["name"] for d in docs] or CATEGORIES

# Models
class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor: str = ""
    date: str  # ISO date YYYY-MM-DD
    amount: float
    category: str = "Otros"
    notes: str = ""
    items: List[dict] = Field(default_factory=list)
    receipt_path: Optional[str] = None  # storage path
    receipt_url: Optional[str] = None   # backend URL to fetch
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ExpenseCreate(BaseModel):
    vendor: str = ""
    date: str
    amount: float
    category: str = "Otros"
    notes: str = ""
    items: List[dict] = Field(default_factory=list)
    receipt_path: Optional[str] = None
    receipt_url: Optional[str] = None


class ExpenseUpdate(BaseModel):
    vendor: Optional[str] = None
    date: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    notes: Optional[str] = None
    items: Optional[List[dict]] = None


class Budget(BaseModel):
    total: float = 0.0
    alert_at: float = 80.0
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class BudgetUpdate(BaseModel):
    total: float
    alert_at: Optional[float] = None


class Category(BaseModel):
    name: str
    icon: str = "MoreHorizontal"
    color: str = "stone"


class CategoryCreate(BaseModel):
    name: str
    icon: Optional[str] = "MoreHorizontal"
    color: Optional[str] = "stone"

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
                await db.categories.insert_many([dict(c) for c in DEFAULT_CATEGORIES])
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
async def get_categories():
    docs = await db.categories.find({}, {"_id": 0}).to_list(500)
    if not docs:
        return {"categories": [dict(c) for c in DEFAULT_CATEGORIES]}
    # Return in insertion order but always ensure "Otros" is last if present
    docs_sorted = sorted(docs, key=lambda d: (d["name"] == "Otros", d["name"]))
    return {"categories": docs_sorted}


@api_router.post("/categories", response_model=Category)
async def create_category(payload: CategoryCreate):
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre no puede estar vacío")
    if len(name) > 40:
        raise HTTPException(status_code=400, detail="Nombre demasiado largo (máx 40)")
    existing = await db.categories.find_one({"name": name})
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe una categoría con ese nombre")
    icon = payload.icon if payload.icon in ALLOWED_ICONS else "MoreHorizontal"
    color = payload.color if payload.color in ALLOWED_COLORS else "stone"
    doc = {"name": name, "icon": icon, "color": color}
    await db.categories.insert_one(doc)
    return Category(**doc)


@api_router.delete("/categories/{name}")
async def delete_category(name: str):
    if name == "Otros":
        raise HTTPException(status_code=400, detail="La categoría 'Otros' no se puede borrar")
    used = await db.expenses.count_documents({"category": name})
    if used > 0:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede borrar: hay {used} gasto(s) en esta categoría",
        )
    result = await db.categories.delete_one({"name": name})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return {"ok": True}


# --- Expenses CRUD ---
@api_router.post("/expenses", response_model=Expense)
async def create_expense(payload: ExpenseCreate):
    names = await get_category_names()
    if payload.category not in names:
        payload.category = "Otros"
    exp = Expense(**payload.model_dump())
    await db.expenses.insert_one(exp.model_dump())
    return exp


@api_router.get("/expenses", response_model=List[Expense])
async def list_expenses(
    category: Optional[str] = None,
    q: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
):
    query = {}
    if category and category != "all":
        query["category"] = category
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
    writer.writerow(["Fecha", "Proveedor", "Categoría", "Importe (€)", "Notas"])
    for d in docs:
        writer.writerow([d.get("date", ""), d.get("vendor", ""), d.get("category", ""),
                         f"{float(d.get('amount', 0)):.2f}", d.get("notes", "")])
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
        names = await get_category_names()
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
async def get_stats():
    docs = await db.expenses.find({}, {"_id": 0}).to_list(5000)
    total = sum(float(d.get("amount", 0)) for d in docs)
    names = await get_category_names()
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
    budget_total = float(budget_doc["total"]) if budget_doc else 0.0
    budget_alert = float(budget_doc.get("alert_at", 80)) if budget_doc else 80.0

    return {
        "total_spent": round(total, 2),
        "count": len(docs),
        "budget": budget_total,
        "remaining": round(budget_total - total, 2),
        "progress": round((total / budget_total * 100) if budget_total > 0 else 0, 2),
        "alert_at": budget_alert,
        "by_category": [{"category": k, "total": round(v, 2)} for k, v in by_cat.items()],
        "monthly": monthly_list,
    }


# --- Budget ---
@api_router.get("/budget")
async def get_budget():
    doc = await db.budget.find_one({"_id": "singleton"})
    if not doc:
        return {"total": 0.0, "alert_at": 80.0}
    return {
        "total": float(doc.get("total", 0)),
        "alert_at": float(doc.get("alert_at", 80)),
        "updated_at": doc.get("updated_at"),
    }


@api_router.put("/budget")
async def set_budget(payload: BudgetUpdate):
    now = datetime.now(timezone.utc).isoformat()
    alert = float(payload.alert_at) if payload.alert_at and payload.alert_at > 0 else 80.0
    await db.budget.update_one(
        {"_id": "singleton"},
        {"$set": {"total": float(payload.total), "alert_at": alert, "updated_at": now}},
        upsert=True,
    )
    return {"total": float(payload.total), "alert_at": alert, "updated_at": now}


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


@api_router.post("/receipts/scan")
async def scan_receipt(file: UploadFile = File(...)):
    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    ext, ctype = _guess_ext_and_ctype(file.filename or "receipt.jpg", file.content_type)

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

    # Analyze with Gemini
    extracted = {
        "vendor": "",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "amount": 0.0,
        "category": "Otros",
        "items": [],
        "notes": "",
    }
    try:
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
        text = str(response).strip()
        # strip markdown fences if any
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:].strip()
        # find JSON
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            text = text[start:end + 1]
        parsed = json.loads(text)
        for k in extracted.keys():
            if k in parsed and parsed[k] is not None:
                extracted[k] = parsed[k]
        # normalize
        try:
            extracted["amount"] = float(extracted.get("amount") or 0)
        except Exception:
            extracted["amount"] = 0.0
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
async def download_file(path: str):
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
