const DB_NAME = "gastocontrol";
const DB_VERSION = 1;
const STORE = "kv";

// Los ficheros locales (imágenes/PDF) se guardan con este prefijo y los gastos
// solo referencian un id, para no arrastrar los base64 en cada listado.
export const LOCAL_FILE_PREFIX = "gastocontrol:file:";
export const localFileKey = (id) => `${LOCAL_FILE_PREFIX}${id}`;

function open() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let req;
    try {
      req = fn(store);
    } catch (e) {
      reject(e);
      return;
    }
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function dbGet(key) {
  return withStore("readonly", (s) => s.get(key));
}

export function dbSet(key, value) {
  return withStore("readwrite", (s) => s.put(value, key));
}

export function dbDel(key) {
  return withStore("readwrite", (s) => s.delete(key));
}

export function dbClear() {
  return withStore("readwrite", (s) => s.clear());
}

export function dbKeys() {
  return withStore("readonly", (s) => s.getAllKeys());
}