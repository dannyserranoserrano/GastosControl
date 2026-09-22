/* Web Share Target: recibe la imagen/PDF compartida desde otra app,
   la guarda en caché y redirige al escáner. Se importa desde el service worker. */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (req.method !== "POST" || url.pathname !== "/share-target") return;

  event.respondWith(
    (async () => {
      try {
        const formData = await req.formData();
        const file = formData.get("ticket") || formData.get("file");
        if (file && typeof file === "object" && file.size > 0) {
          const cache = await caches.open("gastocontrol-share");
          await cache.put(
            "/shared-file",
            new Response(file, {
              headers: {
                "content-type": file.type || "application/octet-stream",
                "x-share-name": encodeURIComponent(file.name || "compartido"),
              },
            })
          );
        }
      } catch {
        /* ignore */
      }
      return Response.redirect("/escanear?shared=1", 303);
    })()
  );
});
