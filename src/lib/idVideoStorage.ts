import { IDVideoItem } from "../types";

const DB_NAME = "f1_dashboard_db";
const DB_VERSION = 1;
const STORE_ID_VIDEOS = "id_videos";
const STORE_HYDRATED = "hydrated_videos";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not supported in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_ID_VIDEOS)) {
        db.createObjectStore(STORE_ID_VIDEOS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_HYDRATED)) {
        db.createObjectStore(STORE_HYDRATED, { keyPath: "id" });
      }
    };

    request.onsuccess = (e: any) => {
      resolve(e.target.result);
    };

    request.onerror = (e) => {
      reject(e);
    };
  });
}

// In-memory fallback
let memIdVideos: IDVideoItem[] = [];
let memHydratedVideos: any[] = [];

export async function saveIdVideosDB(videos: IDVideoItem[]): Promise<void> {
  memIdVideos = videos;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_ID_VIDEOS, "readwrite");
    const store = tx.objectStore(STORE_ID_VIDEOS);
    store.clear();
    for (const v of videos) {
      store.put(v);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("IndexedDB unavailable, falling back to memory/localStorage", err);
    try {
      // Only keep sample in localStorage to avoid QuotaExceededError
      localStorage.setItem("f1_id_videos_count", String(videos.length));
      if (videos.length <= 500) {
        localStorage.setItem("f1_id_videos_metadata", JSON.stringify(videos));
      }
    } catch (e) {}
  }
}

export async function getIdVideosDB(): Promise<IDVideoItem[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_ID_VIDEOS, "readonly");
    const store = tx.objectStore(STORE_ID_VIDEOS);
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const res = request.result || [];
        if (res.length > 0) {
          memIdVideos = res;
          resolve(res);
        } else if (memIdVideos.length > 0) {
          resolve(memIdVideos);
        } else {
          try {
            const raw = localStorage.getItem("f1_id_videos_metadata");
            resolve(raw ? JSON.parse(raw) : []);
          } catch (e) {
            resolve([]);
          }
        }
      };
      request.onerror = () => resolve(memIdVideos);
    });
  } catch (err) {
    if (memIdVideos.length > 0) return memIdVideos;
    try {
      const raw = localStorage.getItem("f1_id_videos_metadata");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
}

export async function saveHydratedVideosDB(videos: any[]): Promise<void> {
  memHydratedVideos = videos;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_HYDRATED, "readwrite");
    const store = tx.objectStore(STORE_HYDRATED);
    store.clear();
    for (const v of videos) {
      store.put(v);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("IndexedDB unavailable for hydrated cache", err);
  }
}

export async function getHydratedVideosDB(): Promise<any[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_HYDRATED, "readonly");
    const store = tx.objectStore(STORE_HYDRATED);
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const res = request.result || [];
        if (res.length > 0) {
          memHydratedVideos = res;
          resolve(res);
        } else if (memHydratedVideos.length > 0) {
          resolve(memHydratedVideos);
        } else {
          resolve([]);
        }
      };
      request.onerror = () => resolve(memHydratedVideos);
    });
  } catch (err) {
    return memHydratedVideos;
  }
}

export async function clearIdVideosDB(): Promise<void> {
  memIdVideos = [];
  memHydratedVideos = [];
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_ID_VIDEOS, STORE_HYDRATED], "readwrite");
    tx.objectStore(STORE_ID_VIDEOS).clear();
    tx.objectStore(STORE_HYDRATED).clear();
    localStorage.removeItem("f1_id_videos_metadata");
    localStorage.removeItem("f1_id_videos_hydrated_cache");
    localStorage.removeItem("f1_id_videos_count");
  } catch (e) {
    try {
      localStorage.removeItem("f1_id_videos_metadata");
      localStorage.removeItem("f1_id_videos_hydrated_cache");
      localStorage.removeItem("f1_id_videos_count");
    } catch (err) {}
  }
}
