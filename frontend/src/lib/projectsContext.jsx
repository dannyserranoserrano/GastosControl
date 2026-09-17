import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";
import { loadTemplates, saveTemplates } from "./recurring";

const LIST_KEY = "gastocontrol:projects";
const ACTIVE_KEY = "gastocontrol:active_project";

const DEFAULT_META = { description: "", color: "indigo", icon: "Package" };

const ProjectsCtx = createContext({
  projects: [],
  projectMeta: {},
  activeProject: "",
  setActiveProject: () => {},
  addProject: () => null,
  removeProject: () => {},
  renameProject: () => {},
  updateProject: () => {},
  refreshFromExpenses: () => {},
});

function normalizeEntry(item) {
  if (typeof item === "string") return { name: item.trim(), ...DEFAULT_META };
  if (item && typeof item === "object" && typeof item.name === "string") {
    return {
      name: item.name.trim(),
      description: typeof item.description === "string" ? item.description : "",
      color: item.color || DEFAULT_META.color,
      icon: item.icon || DEFAULT_META.icon,
    };
  }
  return null;
}

function loadRaw() {
  try {
    const raw = JSON.parse(localStorage.getItem(LIST_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeEntry).filter(Boolean);
  } catch {
    return [];
  }
}

function saveRaw(list) {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function loadActive() {
  try {
    return localStorage.getItem(ACTIVE_KEY) || "";
  } catch {
    return "";
  }
}

const lower = (s) => String(s || "").trim().toLowerCase();

export function ProjectsProvider({ children }) {
  const [raw, setRaw] = useState(loadRaw);
  const [activeProject, setActiveState] = useState(loadActive);

  useEffect(() => {
    saveRaw(raw);
  }, [raw]);

  const setActiveProject = useCallback((name) => {
    const v = String(name || "").trim();
    setActiveState(v);
    try {
      if (v) localStorage.setItem(ACTIVE_KEY, v);
      else localStorage.removeItem(ACTIVE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const addProject = useCallback((name) => {
    const n = String(name || "").trim().slice(0, 80);
    if (!n) return null;
    setRaw((prev) =>
      prev.some((p) => lower(p.name) === lower(n))
        ? prev
        : [...prev, { name: n, ...DEFAULT_META }].sort((a, b) => a.name.localeCompare(b.name))
    );
    return n;
  }, []);

  const removeProject = useCallback((name) => {
    setRaw((prev) => prev.filter((p) => p.name !== name));
    setActiveState((cur) => {
      if (cur !== name) return cur;
      try {
        localStorage.removeItem(ACTIVE_KEY);
      } catch {
        /* ignore */
      }
      return "";
    });
  }, []);

  const updateProject = useCallback((name, meta) => {
    setRaw((prev) =>
      prev.map((p) =>
        p.name === name
          ? {
              ...p,
              description:
                meta.description === undefined ? p.description : String(meta.description).slice(0, 200),
              color: meta.color || p.color,
              icon: meta.icon || p.icon,
            }
          : p
      )
    );
  }, []);

  const renameProject = useCallback(
    async (from, to) => {
      const dst = String(to || "").trim().slice(0, 80);
      if (!dst || dst === from) return from;
      if (raw.some((p) => lower(p.name) === lower(dst) && lower(p.name) !== lower(from))) {
        throw new Error(`Ya existe el proyecto «${dst}». Elige otro nombre.`);
      }

      await api.post("/projects/rename", { from, to: dst });

      try {
        const tpls = loadTemplates();
        if (tpls.some((t) => (t.project || "") === from)) {
          saveTemplates(
            tpls.map((t) => ((t.project || "") === from ? { ...t, project: dst } : t))
          );
        }
      } catch {
        /* ignore */
      }

      setRaw((prev) =>
        prev
          .map((p) => (p.name === from ? { ...p, name: dst } : p))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      if (lower(activeProject) === lower(from)) setActiveProject(dst);
      return dst;
    },
    [raw, activeProject, setActiveProject]
  );

  const refreshFromExpenses = useCallback((expenses) => {
    const names = [
      ...new Set((expenses || []).map((e) => String(e.project || "").trim()).filter(Boolean)),
    ];
    if (names.length === 0) return;
    setRaw((prev) => {
      const map = new Map(prev.map((p) => [lower(p.name), p]));
      let changed = false;
      names.forEach((n) => {
        if (!map.has(lower(n))) {
          map.set(lower(n), { name: n, ...DEFAULT_META });
          changed = true;
        }
      });
      if (!changed) return prev;
      return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
    });
  }, []);

  const projects = raw.map((p) => p.name);
  const projectMeta = Object.fromEntries(
    raw.map((p) => [p.name, { description: p.description, color: p.color, icon: p.icon }])
  );

  return (
    <ProjectsCtx.Provider
      value={{
        projects,
        projectMeta,
        activeProject,
        setActiveProject,
        addProject,
        removeProject,
        renameProject,
        updateProject,
        refreshFromExpenses,
      }}
    >
      {children}
    </ProjectsCtx.Provider>
  );
}

export function useProjects() {
  return useContext(ProjectsCtx);
}
