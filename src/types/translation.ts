/* eslint-disable @typescript-eslint/no-explicit-any */
export interface TranslationRequest {
  q: string | string[];
  source: string;
  target: string;
  format?: 'text' | 'html';
  api_key?: string;
}

export interface TranslationResponse {
  translatedText: string | string[];
}

export interface LanguageInfo {
  code: string;
  name: string;
}

export interface TranslationJob {
  id: string;
  originalText: string;
  translatedText?: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: 'pending' | 'translating' | 'completed' | 'error' | 'skipped';
  error?: string;
  retryCount: number;
  timestamp: number;
}

export interface TranslationBatch {
  id: string;
  jobs: TranslationJob[];
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  startTime?: number;
  endTime?: number;
}

export interface TranslationSession {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  originalJson: any;
  translatedJson?: any;
  batches: TranslationBatch[];
  totalStrings: number;
  translatedStrings: number;
  skippedStrings: number;
  errorStrings: number;
  status: 'idle' | 'processing' | 'completed' | 'paused' | 'error';
  startTime?: number;
  endTime?: number;
  logs: TranslationLog[];
}

export interface TranslationLog {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: any;
}

export interface CacheEntry {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedText: string;
  timestamp: number;
}

export interface JsonDiff {
  path: string[];
  original: any;
  translated: any;
  type: 'added' | 'removed' | 'changed' | 'unchanged';
}

export interface FileUploadState {
  file: File | null;
  content: any;
  isValid: boolean;
  error?: string;
}

export interface TranslationConfig {
  sourceLanguage: string;
  targetLanguage: string;
  batchSize: number;
  maxRetries: number;
  skipPatterns: string[];
  preservePatterns: string[];
  autoDetectSource: boolean;
}

export interface RateLimiter {
  requests: number[];
  maxRequests: number;
  windowMs: number;
}

export interface TranslationStats {
  totalProcessed: number;
  totalTranslated: number;
  totalSkipped: number;
  totalErrors: number;
  averageTime: number;
  cacheHitRate: number;
}
