import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";
import { loadTemplates, saveTemplates } from "./recurring";

const LIST_KEY = "gastocontrol:projects";
const ACTIVE_KEY = "gastocontrol:active_project";

const ProjectsCtx = createContext({
  projects: [],
  activeProject: "",
  setActiveProject: () => {},
  addProject: () => null,
  removeProject: () => {},
  renameProject: () => {},
  refreshFromExpenses: () => {},
});

function loadList() {
  try {
    const raw = JSON.parse(localStorage.getItem(LIST_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((n) => typeof n === "string") : [];
  } catch {
    return [];
  }
}

function saveList(list) {
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

export function ProjectsProvider({ children }) {
  const [projects, setProjects] = useState(loadList);
  const [activeProject, setActiveState] = useState(loadActive);

  useEffect(() => {
    saveList(projects);
  }, [projects]);

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
    setProjects((prev) =>
      prev.some((p) => p.toLowerCase() === n.toLowerCase())
        ? prev
        : [...prev, n].sort((a, b) => a.localeCompare(b))
    );
    return n;
  }, []);

  const removeProject = useCallback((name) => {
    setProjects((prev) => prev.filter((p) => p !== name));
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

  const renameProject = useCallback(
    async (from, to) => {
      const dst = String(to || "").trim().slice(0, 80);
      if (!dst || dst === from) return from;
      const lower = (s) => String(s || "").trim().toLowerCase();
      const conflict = projects.find(
        (p) => lower(p) === lower(dst) && lower(p) !== lower(from)
      );
      if (conflict) {
        throw new Error(`Ya existe el proyecto «${conflict}». Elige otro nombre.`);
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

      const norm = (s) => String(s || "").trim().toLowerCase();
      setProjects((prev) =>
        [...new Set(prev.map((p) => (norm(p) === norm(from) ? dst : p)))].sort((a, b) =>
          a.localeCompare(b)
        )
      );
      if (norm(activeProject) === norm(from)) setActiveProject(dst);
      return dst;
    },
    [projects, activeProject, setActiveProject]
  );

  const refreshFromExpenses = useCallback((expenses) => {
    const names = [
      ...new Set((expenses || []).map((e) => String(e.project || "").trim()).filter(Boolean)),
    ];
    if (names.length === 0) return;
    setProjects((prev) => {
      const map = new Map(prev.map((p) => [p.toLowerCase(), p]));
      let changed = false;
      names.forEach((n) => {
        if (!map.has(n.toLowerCase())) {
          map.set(n.toLowerCase(), n);
          changed = true;
        }
      });
      if (!changed) return prev;
      return [...map.values()].sort((a, b) => a.localeCompare(b));
    });
  }, []);

  return (
    <ProjectsCtx.Provider
      value={{ projects, activeProject, setActiveProject, addProject, removeProject, renameProject, refreshFromExpenses }}
    >
      {children}
    </ProjectsCtx.Provider>
  );
}

export function useProjects() {
  return useContext(ProjectsCtx);
}
