import { CacheEntry } from '@/types/translation';

class CacheService {
  private cacheName = 'translation-cache';
  private dbName = 'TranslationDB';
  private dbVersion = 1;
  private storeName = 'translations';

  // In-memory cache for frequently accessed items
  private memoryCache = new Map<string, CacheEntry>();
  private maxMemorySize = 1000;

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  private getCacheKey(text: string, sourceLanguage: string, targetLanguage: string): string {
    // Create a hash-like key for consistent lookups
    return btoa(encodeURIComponent(`${text}-${sourceLanguage}-${targetLanguage}`));
  }

  async get(text: string, sourceLanguage: string, targetLanguage: string): Promise<string | null> {
    const key = this.getCacheKey(text, sourceLanguage, targetLanguage);
    
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValidEntry(memoryEntry)) {
      return memoryEntry.translatedText;
    }

    // Check IndexedDB
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const result = request.result;
          if (result && this.isValidEntry(result.entry)) {
            // Add to memory cache
            this.addToMemoryCache(key, result.entry);
            resolve(result.entry.translatedText);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async set(text: string, sourceLanguage: string, targetLanguage: string, translatedText: string): Promise<void> {
    const key = this.getCacheKey(text, sourceLanguage, targetLanguage);
    const entry: CacheEntry = {
      text,
      sourceLanguage,
      targetLanguage,
      translatedText,
      timestamp: Date.now()
    };

    // Add to memory cache
    this.addToMemoryCache(key, entry);

    // Save to IndexedDB
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await store.put({ key, entry });
    } catch (error) {
      console.error('Failed to save to cache:', error);
    }
  }

  async getBatch(requests: Array<{ text: string; sourceLanguage: string; targetLanguage: string }>): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    for (const request of requests) {
      const result = await this.get(request.text, request.sourceLanguage, request.targetLanguage);
      if (result) {
        const key = this.getCacheKey(request.text, request.sourceLanguage, request.targetLanguage);
        results.set(key, result);
      }
    }
    
    return results;
  }

  async setBatch(entries: Array<{ text: string; sourceLanguage: string; targetLanguage: string; translatedText: string }>): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      for (const entry of entries) {
        const key = this.getCacheKey(entry.text, entry.sourceLanguage, entry.targetLanguage);
        const cacheEntry: CacheEntry = {
          ...entry,
          timestamp: Date.now()
        };
        
        // Add to memory cache
        this.addToMemoryCache(key, cacheEntry);
        
        // Add to IndexedDB
        await store.put({ key, entry: cacheEntry });
      }
    } catch (error) {
      console.error('Failed to save batch to cache:', error);
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await store.clear();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  async cleanupExpired(): Promise<void> {
    const ttl = parseInt(process.env.NEXT_PUBLIC_CACHE_TTL || '86400000', 10); // 24 hours default
    const cutoff = Date.now() - ttl;

    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < cutoff) {
        this.memoryCache.delete(key);
      }
    }

    // Clean IndexedDB
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoff);
      
      const request = index.openKeyCursor(range);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
    } catch (error) {
      console.error('Failed to cleanup expired cache:', error);
    }
  }

  private isValidEntry(entry: CacheEntry): boolean {
    const ttl = parseInt(process.env.NEXT_PUBLIC_CACHE_TTL || '86400000', 10);
    return Date.now() - entry.timestamp < ttl;
  }

  private addToMemoryCache(key: string, entry: CacheEntry): void {
    // Remove oldest entries if cache is full
    if (this.memoryCache.size >= this.maxMemorySize) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }
    
    this.memoryCache.set(key, entry);
  }

  async getStats(): Promise<{ memorySize: number; indexedDBSize: number }> {
    const memorySize = this.memoryCache.size;
    
    let indexedDBSize = 0;
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const countRequest = store.count();
      
      indexedDBSize = await new Promise((resolve) => {
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => resolve(0);
      });
    } catch {
      indexedDBSize = 0;
    }

    return { memorySize, indexedDBSize };
  }
}

export const cacheService = new CacheService();
