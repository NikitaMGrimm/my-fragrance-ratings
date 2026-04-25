import { Perfume } from '../types';
import { parseCSV } from './csvParser';

const STORAGE_KEY = 'my_perfume_collection';
const STORAGE_META_KEY = 'my_perfume_collection_meta';
const DB_NAME = 'PerfumeCacheDB';
const STORE_NAME = 'images';
const DB_VERSION = 1;

type CollectionMode = 'default' | 'custom' | 'legacy-default' | 'legacy-custom';

type CollectionMeta = {
  mode?: 'default' | 'custom';
  savedAt?: string;
};

export type StoredPerfumeCollection = {
  perfumes: Perfume[];
  mode: CollectionMode;
};

const getPerfumeId = (perfume: Pick<Perfume, 'pid' | 'brand' | 'name'>) => {
  const pid = String(perfume.pid || '').trim();
  if (pid && pid !== '0') return pid;
  return `${perfume.brand || ''}|${perfume.name || ''}`;
};

const loadCollectionMeta = (): CollectionMeta | null => {
  try {
    const stored = localStorage.getItem(STORAGE_META_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to load collection metadata", e);
    return null;
  }
};

const saveCollectionMeta = (mode: 'default' | 'custom') => {
  try {
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify({
      mode,
      savedAt: new Date().toISOString()
    }));
  } catch (e) {
    console.error("Failed to save collection metadata", e);
  }
};

const matchesDefaultPrefix = (stored: Perfume[], defaultPerfumes: Perfume[]) => {
  if (stored.length === 0 || defaultPerfumes.length === 0 || stored.length > defaultPerfumes.length) {
    return false;
  }

  return stored.every((perfume, index) => getPerfumeId(perfume) === getPerfumeId(defaultPerfumes[index]));
};

export const loadPerfumesFromStorage = (defaultPerfumes: Perfume[] = []): StoredPerfumeCollection | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const perfumes = JSON.parse(stored);
      if (!Array.isArray(perfumes)) return null;

      const meta = loadCollectionMeta();
      if (meta?.mode === 'custom' || meta?.mode === 'default') {
        return { perfumes, mode: meta.mode };
      }

      return {
        perfumes,
        mode: matchesDefaultPrefix(perfumes, defaultPerfumes) ? 'legacy-default' : 'legacy-custom'
      };
    }
  } catch (e) {
    console.error("Failed to load from local storage", e);
  }
  return null;
};

export const fetchDefaultCSV = async (): Promise<Perfume[]> => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}constants.csv`, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error("CSV file not found");
    }
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (e) {
    console.warn("Could not load constants.csv", e);
    return [];
  }
};

const savePerfumesWithMode = (perfumes: Perfume[], mode: 'default' | 'custom') => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(perfumes));
    saveCollectionMeta(mode);
  } catch (e) {
    console.error("Failed to save to local storage", e);
  }
};

export const savePerfumes = (perfumes: Perfume[]) => savePerfumesWithMode(perfumes, 'custom');

export const saveDefaultPerfumes = (perfumes: Perfume[]) => savePerfumesWithMode(perfumes, 'default');

export const clearStoredPerfumes = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_META_KEY);
  } catch (e) {
    console.error("Failed to clear local storage", e);
  }
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const getCachedImageBlob = async (url: string): Promise<Blob | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(url);
      
      request.onsuccess = () => resolve(request.result as Blob || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("Error reading from IDB", e);
    return null;
  }
};

export const cacheImageBlob = async (url: string, blob: Blob): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(blob, url);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("Error writing to IDB", e);
  }
};

export const clearUnusedImages = async (activeUrls: string[]): Promise<number> => {
  try {
    const db = await openDB();
    const activeSet = new Set(activeUrls);
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          const urlKey = cursor.key as string;
          if (!activeSet.has(urlKey)) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to clear cache", e);
    return 0;
  }
};

export const clearImageCache = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
};
