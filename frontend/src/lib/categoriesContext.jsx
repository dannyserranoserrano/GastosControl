import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";
import { useProjects } from "./projectsContext";

const CategoriesCtx = createContext({
  categories: [],
  loading: true,
  reload: () => {},
});

export function CategoriesProvider({ children }) {
  const { activeProject } = useProjects();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const params = activeProject ? { project: activeProject } : {};
      const { data } = await api.get("/categories", { params });
      setCategories(data.categories || []);
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { reload(); }, [reload]);

  return (
    <CategoriesCtx.Provider value={{ categories, loading, reload, project: activeProject }}>
      {children}
    </CategoriesCtx.Provider>
  );
}

export function useCategories() {
  return useContext(CategoriesCtx);
}
