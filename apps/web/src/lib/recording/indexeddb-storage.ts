export type StoredRun = {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  distanceMeters: number;
  avgPaceSecondsPerKm: number | null;
  pointsCount: number;
  gpx: string;
  createdAt: string;
};

const DB_NAME = "runners_dubai_local";
const DB_VERSION = 1;
const STORE_NAME = "runs";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB no está disponible en este dispositivo."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("startedAt", "startedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Error al abrir IndexedDB"));
  });
}

export const localRunStorage = {
  async saveRun(run: StoredRun): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(run);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error("No se pudo guardar la carrera"));
      transaction.oncomplete = () => db.close();
    });
  },

  async getAllRuns(): Promise<StoredRun[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result as StoredRun[]) || [];
        // Sort newest first
        results.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        resolve(results);
      };
      request.onerror = () =>
        reject(request.error || new Error("No se pudieron leer las carreras"));
      transaction.oncomplete = () => db.close();
    });
  },

  async getRunById(id: string): Promise<StoredRun | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve((request.result as StoredRun) || null);
      request.onerror = () => reject(request.error || new Error("Error al buscar la carrera"));
      transaction.oncomplete = () => db.close();
    });
  },
};
