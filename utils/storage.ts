import { Perfume } from '../types';
import { parseCSV } from './csvParser';

const STORAGE_KEY = 'my_perfume_collection';
const DB_NAME = 'PerfumeCacheDB';
const STORE_NAME = 'images';
const DB_VERSION = 1;

export const loadPerfumesFromStorage = (): Perfume[] | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load from local storage", e);
  }
  return null;
};

export const fetchDefaultCSV = async (): Promise<Perfume[]> => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}constants.csv`);
    if (!response.ok) {
        throw new Error("CSV file not found");
    }
    const csvText = await response.text();
    const data = parseCSV(csvText);
    savePerfumes(data);
    return data;
  } catch (e) {
    console.warn("Could not load constants.csv", e);
    return [];
  }
};

export const savePerfumes = (perfumes: Perfume[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(perfumes));
  } catch (e) {
    console.error("Failed to save to local storage", e);
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