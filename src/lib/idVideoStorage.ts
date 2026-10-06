import { IDVideoItem } from "../types";

const DB_NAME = "f1_dashboard_db";
const DB_VERSION = 1;
const STORE_ID_VIDEOS = "id_videos";
const STORE_HYDRATED = "hydrated_videos";

export function cleanHydratedItem(v: any): any {
  if (!v) return v;
  return {
    id: v.id,
    snippet: {
      title: v.snippet?.title || `Video ${v.id}`,
      publishedAt: v.snippet?.publishedAt || new Date().toISOString(),
      channelId: v.snippet?.channelId || "",
      channelTitle: v.snippet?.channelTitle || "",
      thumbnails: {
        default: { url: v.snippet?.thumbnails?.default?.url || `https://img.youtube.com/vi/${v.id}/default.jpg` },
        medium: { url: v.snippet?.thumbnails?.medium?.url || `https://img.youtube.com/vi/${v.id}/mqdefault.jpg` },
      },
    },
    statistics: {
      viewCount: String(v.statistics?.viewCount ?? "0"),
      likeCount: String(v.statistics?.likeCount ?? "0"),
      commentCount: String(v.statistics?.commentCount ?? "0"),
    },
    contentDetails: {
      duration: v.contentDetails?.duration || "",
    },
    _isShort: Boolean(v._isShort),
    _idMeta: v._idMeta,
  };
}

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

// In-memory persistent caches across tab lifetime
let memIdVideos: IDVideoItem[] = [];
let memHydratedVideos: any[] = [];

export async function saveIdVideosDB(videos: IDVideoItem[]): Promise<void> {
  memIdVideos = videos;

  // 1. Immediately save to localStorage for instant 0ms restoration
  try {
    localStorage.setItem("f1_id_videos_metadata", JSON.stringify(videos));
    localStorage.setItem("f1_id_videos_count", String(videos.length));
  } catch (e) {
    try {
      // If full array exceeds quota, store first 1000 items
      localStorage.setItem("f1_id_videos_metadata", JSON.stringify(videos.slice(0, 1000)));
    } catch (_) {}
  }

  // 2. Persist to server disk store (survives tab closing, browser reload, system reboot)
  try {
    fetch("/api/id-videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idVideos: videos }),
    }).catch((e) => console.warn("Could not save to /api/id-videos", e));
  } catch (e) {}

  // 3. Persist to IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_ID_VIDEOS, "readwrite");
    const store = tx.objectStore(STORE_ID_VIDEOS);
    store.clear();
    for (const v of videos) {
      if (v && v.id) {
        store.put(v);
      }
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("IndexedDB save warning:", err);
  }
}

export async function getIdVideosDB(): Promise<IDVideoItem[]> {
  if (memIdVideos.length > 0) return memIdVideos;

  // 1. Fast check: localStorage (0ms sync)
  try {
    const raw = localStorage.getItem("f1_id_videos_metadata");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memIdVideos = parsed;
      }
    }
  } catch (e) {}

  // 2. Try server disk-store (authoritative source of truth)
  try {
    const res = await fetch("/api/id-videos");
    if (res.ok) {
      const data = await res.json();
      if (data?.idVideos && Array.isArray(data.idVideos) && data.idVideos.length > 0) {
        memIdVideos = data.idVideos;
        // Keep localStorage and IndexedDB in sync
        try {
          localStorage.setItem("f1_id_videos_metadata", JSON.stringify(data.idVideos));
        } catch (_) {}
        return data.idVideos;
      }
    }
  } catch (e) {}

  // 3. Try IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_ID_VIDEOS, "readonly");
    const store = tx.objectStore(STORE_ID_VIDEOS);
    const request = store.getAll();
    const items = await new Promise<IDVideoItem[]>((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });

    if (items.length > 0) {
      memIdVideos = items;
      return items;
    }
  } catch (err) {
    console.warn("IndexedDB read warning:", err);
  }

  return memIdVideos;
}

export async function saveHydratedVideosBatchDB(batch: any[]): Promise<void> {
  if (!batch || batch.length === 0) return;

  const cleanedBatch = batch.map(cleanHydratedItem);

  // 1. Update in-memory cache
  const map = new Map<string, any>();
  memHydratedVideos.forEach((v) => map.set(v.id, v));
  cleanedBatch.forEach((v) => map.set(v.id, v));
  memHydratedVideos = Array.from(map.values());

  // 2. Send lean batch to server disk store
  try {
    fetch("/api/id-videos/batch-hydrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchVideos: cleanedBatch }),
    }).catch((e) => console.warn("Could not save batch to /api/id-videos/batch-hydrate", e));
  } catch (e) {}

  // 3. Incrementally put into IndexedDB without clearing
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_HYDRATED, "readwrite");
    const store = tx.objectStore(STORE_HYDRATED);
    for (const v of cleanedBatch) {
      if (v && v.id) {
        store.put(v);
      }
    }
  } catch (err) {
    console.warn("IndexedDB batch save warning:", err);
  }

  // 4. Update localStorage safely
  try {
    localStorage.setItem("f1_id_videos_hydrated_cache", JSON.stringify(memHydratedVideos));
  } catch (e) {
    try {
      localStorage.setItem("f1_id_videos_hydrated_cache", JSON.stringify(memHydratedVideos.slice(0, 500)));
    } catch (_) {}
  }
}

export async function saveHydratedVideosDB(videos: any[]): Promise<void> {
  const cleaned = videos.map(cleanHydratedItem);
  memHydratedVideos = cleaned;

  // 1. Save to localStorage
  try {
    localStorage.setItem("f1_id_videos_hydrated_cache", JSON.stringify(cleaned));
  } catch (e) {
    try {
      localStorage.setItem("f1_id_videos_hydrated_cache", JSON.stringify(cleaned.slice(0, 500)));
    } catch (_) {}
  }

  // 2. Persist to server store
  try {
    fetch("/api/id-videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hydratedVideos: cleaned }),
    }).catch((e) => console.warn("Could not save hydrated items to /api/id-videos", e));
  } catch (e) {}

  // 3. Persist to IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_HYDRATED, "readwrite");
    const store = tx.objectStore(STORE_HYDRATED);
    store.clear();
    for (const v of cleaned) {
      if (v && v.id) {
        store.put(v);
      }
    }
  } catch (err) {
    console.warn("IndexedDB hydrated save warning:", err);
  }
}

export async function getHydratedVideosDB(): Promise<any[]> {
  if (memHydratedVideos.length > 0) return memHydratedVideos;

  // 1. Fast check: localStorage (0ms sync)
  try {
    const raw = localStorage.getItem("f1_id_videos_hydrated_cache");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memHydratedVideos = parsed;
      }
    }
  } catch (e) {}

  // 2. Try server disk-store
  try {
    const res = await fetch("/api/id-videos");
    if (res.ok) {
      const data = await res.json();
      if (data?.hydratedVideos && Array.isArray(data.hydratedVideos) && data.hydratedVideos.length > 0) {
        memHydratedVideos = data.hydratedVideos;
        try {
          localStorage.setItem("f1_id_videos_hydrated_cache", JSON.stringify(data.hydratedVideos));
        } catch (_) {}
        return data.hydratedVideos;
      }
    }
  } catch (e) {}

  // 3. Try IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_HYDRATED, "readonly");
    const store = tx.objectStore(STORE_HYDRATED);
    const request = store.getAll();
    const items = await new Promise<any[]>((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });

    if (items.length > 0) {
      memHydratedVideos = items;
      return items;
    }
  } catch (err) {
    console.warn("IndexedDB hydrated read warning:", err);
  }

  return memHydratedVideos;
}

export async function clearIdVideosDB(): Promise<void> {
  memIdVideos = [];
  memHydratedVideos = [];

  try {
    fetch("/api/id-videos", { method: "DELETE" }).catch(() => {});
  } catch (e) {}

  try {
    const db = await openDB();
    const tx = db.transaction([STORE_ID_VIDEOS, STORE_HYDRATED], "readwrite");
    tx.objectStore(STORE_ID_VIDEOS).clear();
    tx.objectStore(STORE_HYDRATED).clear();
  } catch (e) {}

  try {
    localStorage.removeItem("f1_id_videos_metadata");
    localStorage.removeItem("f1_id_videos_hydrated_cache");
    localStorage.removeItem("f1_id_videos_count");
  } catch (err) {}
}
