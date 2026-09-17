import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";

const CategoriesCtx = createContext({
  categories: [],
  loading: true,
  reload: () => {},
});

export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get("/categories");
      setCategories(data.categories || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <CategoriesCtx.Provider value={{ categories, loading, reload }}>
      {children}
    </CategoriesCtx.Provider>
  );
}

export function useCategories() {
  return useContext(CategoriesCtx);
}
