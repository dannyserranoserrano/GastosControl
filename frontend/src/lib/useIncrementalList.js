import { useEffect, useState } from "react";

// Renderiza solo una parte de la lista y va mostrando más bajo demanda
// (mejora el render inicial en listas largas). Se reinicia al cambiar la lista.
export function useIncrementalList(items, step = 40) {
  const [count, setCount] = useState(step);

  useEffect(() => {
    setCount(step);
  }, [items, step]);

  const total = items.length;
  const visible = count >= total ? items : items.slice(0, count);
  const hasMore = count < total;
  const showMore = () => setCount((c) => c + step);

  return { visible, hasMore, showMore, total, shown: visible.length };
}
