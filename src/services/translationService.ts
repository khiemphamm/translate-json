/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
  TranslationSession, 
  TranslationBatch, 
  TranslationJob, 
  TranslationLog,
  TranslationConfig,
  TranslationStats
} from '@/types/translation';
import { libreTranslateService } from './libreTranslateService';
import { cacheService } from './cacheService';
import { rateLimiterService } from './rateLimiterService';
import { JsonProcessor } from '@/utils/jsonProcessor';
import { v4 as uuidv4 } from 'uuid';

export class TranslationService {
  private currentSession: TranslationSession | null = null;
  private isProcessing = false;
  private pauseRequested = false;
  private onProgressUpdate?: (session: TranslationSession) => void;
  private onLogUpdate?: (log: TranslationLog) => void;

  setProgressCallback(callback: (session: TranslationSession) => void): void {
    this.onProgressUpdate = callback;
  }

  setLogCallback(callback: (log: TranslationLog) => void): void {
    this.onLogUpdate = callback;
  }

  async startTranslation(
    jsonData: any,
    config: TranslationConfig
  ): Promise<TranslationSession> {
    if (this.isProcessing) {
      throw new Error('Translation already in progress');
    }

    // Extract all translatable strings
    const strings = JsonProcessor.extractStrings(jsonData);
    
    if (strings.length === 0) {
      throw new Error('No translatable strings found in the JSON');
    }

    // Deduplicate strings to reduce API calls
    const { unique: uniqueStrings } = JsonProcessor.deduplicateStrings(strings);

    // Create translation session
    const session: TranslationSession = {
      id: uuidv4(),
      sourceLanguage: config.sourceLanguage,
      targetLanguage: config.targetLanguage,
      originalJson: jsonData,
      batches: [],
      totalStrings: strings.length,
      translatedStrings: 0,
      skippedStrings: 0,
      errorStrings: 0,
      status: 'processing',
      startTime: Date.now(),
      logs: []
    };

    this.currentSession = session;
    this.isProcessing = true;
    this.pauseRequested = false;

    this.addLog('info', `Starting translation of ${strings.length} strings (${uniqueStrings.length} unique)`);

    try {
      // Create batches
      const batches = this.createBatches(uniqueStrings, config.batchSize);
      session.batches = batches;

      // Start processing batches
      await this.processBatches(session, config);

      if (!this.pauseRequested) {
        session.status = 'completed';
        session.endTime = Date.now();
        this.addLog('success', `Translation completed in ${((session.endTime - session.startTime!) / 1000).toFixed(2)}s`);
      }

    } catch (error) {
      session.status = 'error';
      session.endTime = Date.now();
      this.addLog('error', `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      this.isProcessing = false;
    }

    return session;
  }

  async resumeTranslation(): Promise<void> {
    if (!this.currentSession || this.isProcessing) {
      throw new Error('No session to resume or already processing');
    }

    this.isProcessing = true;
    this.pauseRequested = false;
    this.currentSession.status = 'processing';

    this.addLog('info', 'Resuming translation...');

    try {
      // Find the configuration from the session
      const config: TranslationConfig = {
        sourceLanguage: this.currentSession.sourceLanguage,
        targetLanguage: this.currentSession.targetLanguage,
        batchSize: parseInt(process.env.NEXT_PUBLIC_BATCH_SIZE || '50', 10),
        maxRetries: parseInt(process.env.NEXT_PUBLIC_MAX_RETRIES || '3', 10),
        skipPatterns: [],
        preservePatterns: [],
        autoDetectSource: this.currentSession.sourceLanguage === 'auto'
      };

      await this.processBatches(this.currentSession, config);

      if (!this.pauseRequested) {
        this.currentSession.status = 'completed';
        this.currentSession.endTime = Date.now();
        this.addLog('success', 'Translation resumed and completed');
      }

    } catch (error) {
      this.currentSession.status = 'error';
      this.addLog('error', `Resume failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  pauseTranslation(): void {
    if (this.isProcessing) {
      this.pauseRequested = true;
      if (this.currentSession) {
        this.currentSession.status = 'paused';
      }
      this.addLog('info', 'Translation paused');
    }
  }

  stopTranslation(): void {
    this.pauseRequested = true;
    this.isProcessing = false;
    if (this.currentSession) {
      this.currentSession.status = 'paused';
    }
    this.addLog('info', 'Translation stopped');
  }

  getCurrentSession(): TranslationSession | null {
    return this.currentSession;
  }

  private createBatches(
    strings: Array<{ path: string[]; value: string; originalIndices: number[] }>,
    batchSize: number
  ): TranslationBatch[] {
    const batches: TranslationBatch[] = [];
    
    for (let i = 0; i < strings.length; i += batchSize) {
      const batchStrings = strings.slice(i, i + batchSize);
      const jobs: TranslationJob[] = batchStrings.map((item) => ({
        id: uuidv4(),
        originalText: item.value,
        sourceLanguage: this.currentSession!.sourceLanguage,
        targetLanguage: this.currentSession!.targetLanguage,
        status: 'pending',
        retryCount: 0,
        timestamp: Date.now()
      }));

      batches.push({
        id: uuidv4(),
        jobs,
        status: 'pending',
        progress: 0
      });
    }

    return batches;
  }

  private async processBatches(session: TranslationSession, config: TranslationConfig): Promise<void> {
    for (const batch of session.batches) {
      if (this.pauseRequested) {
        break;
      }

      if (batch.status === 'completed') {
        continue; // Skip already completed batches (for resume functionality)
      }

      await this.processBatch(batch, config);
      this.updateSessionProgress(session);
    }

    // Apply translations to create the final result
    if (!this.pauseRequested && session.status !== 'error') {
      await this.generateFinalResult(session);
    }
  }

  private async processBatch(batch: TranslationBatch, config: TranslationConfig): Promise<void> {
    batch.status = 'processing';
    batch.startTime = Date.now();

    const pendingJobs = batch.jobs.filter(job => job.status === 'pending' || job.status === 'error');

    for (const job of pendingJobs) {
      if (this.pauseRequested) {
        break;
      }

      await this.processJob(job, config);
      batch.progress = (batch.jobs.filter(j => j.status === 'completed' || j.status === 'skipped').length / batch.jobs.length) * 100;
      
      if (this.onProgressUpdate && this.currentSession) {
        this.onProgressUpdate(this.currentSession);
      }
    }

    if (!this.pauseRequested) {
      batch.status = 'completed';
      batch.endTime = Date.now();
    }
  }

  private async processJob(job: TranslationJob, config: TranslationConfig): Promise<void> {
    try {
      job.status = 'translating';

      // Check cache first
      const cachedResult = await cacheService.get(
        job.originalText,
        job.sourceLanguage,
        job.targetLanguage
      );

      if (cachedResult) {
        job.translatedText = cachedResult;
        job.status = 'completed';
        this.addLog('info', `Cache hit for: "${job.originalText.substring(0, 50)}..."`);
        return;
      }

      // Wait for rate limiter
      await rateLimiterService.waitForSlot();

      // Detect source language if auto
      let sourceLanguage = job.sourceLanguage;
      if (sourceLanguage === 'auto') {
        sourceLanguage = await libreTranslateService.detectLanguage(job.originalText);
        this.addLog('info', `Detected language: ${sourceLanguage} for "${job.originalText.substring(0, 30)}..."`);
      }

      // Translate
      const response = await libreTranslateService.translate({
        q: job.originalText,
        source: sourceLanguage,
        target: job.targetLanguage
      });

      job.translatedText = Array.isArray(response.translatedText) 
        ? response.translatedText[0] 
        : response.translatedText;
      job.status = 'completed';

      // Cache the result
      await cacheService.set(
        job.originalText,
        sourceLanguage,
        job.targetLanguage,
        job.translatedText
      );

      this.addLog('info', `Translated: "${job.originalText}" → "${job.translatedText}"`);

    } catch (error) {
      job.retryCount++;
      
      if (job.retryCount <= config.maxRetries) {
        this.addLog('warning', `Retry ${job.retryCount}/${config.maxRetries} for: "${job.originalText}"`);
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, job.retryCount) * 1000));
        
        return this.processJob(job, config);
      } else {
        job.status = 'error';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        this.addLog('error', `Failed to translate: "${job.originalText}" - ${job.error}`);
      }
    }
  }

  private async generateFinalResult(session: TranslationSession): Promise<void> {
    try {
      // Create translation map from all completed jobs
      const translationMap = new Map<string, string>();
      
      // Build translation map with path-based keys
      const allStrings = JsonProcessor.extractStrings(session.originalJson);
      const { unique: uniqueStrings } = JsonProcessor.deduplicateStrings(allStrings);

      let uniqueIndex = 0;
      for (const batch of session.batches) {
        for (const job of batch.jobs) {
          if (job.status === 'completed' && job.translatedText) {
            const uniqueString = uniqueStrings[uniqueIndex];
            if (uniqueString) {
              // Apply translation to all duplicate occurrences
              for (const originalIndex of uniqueString.originalIndices) {
                const originalString = allStrings[originalIndex];
                const pathKey = originalString.path.join('.');
                translationMap.set(pathKey, job.translatedText);
              }
            }
            uniqueIndex++;
          }
        }
      }

      // Apply translations to create the final JSON
      session.translatedJson = JsonProcessor.applyTranslations(session.originalJson, translationMap);
      
      this.addLog('success', 'Final translated JSON generated');
      
    } catch (error) {
      this.addLog('error', `Failed to generate final result: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private updateSessionProgress(session: TranslationSession): void {
    const completedJobs = session.batches.reduce(
      (sum, batch) => sum + batch.jobs.filter(job => job.status === 'completed').length,
      0
    );
    const skippedJobs = session.batches.reduce(
      (sum, batch) => sum + batch.jobs.filter(job => job.status === 'skipped').length,
      0
    );
    const errorJobs = session.batches.reduce(
      (sum, batch) => sum + batch.jobs.filter(job => job.status === 'error').length,
      0
    );

    session.translatedStrings = completedJobs;
    session.skippedStrings = skippedJobs;
    session.errorStrings = errorJobs;
  }

  private addLog(level: TranslationLog['level'], message: string, details?: any): void {
    if (!this.currentSession) return;

    const log: TranslationLog = {
      id: uuidv4(),
      timestamp: Date.now(),
      level,
      message,
      details
    };

    this.currentSession.logs.push(log);
    
    if (this.onLogUpdate) {
      this.onLogUpdate(log);
    }
  }

  async getTranslationStats(): Promise<TranslationStats> {
    const session = this.currentSession;
    if (!session) {
      return {
        totalProcessed: 0,
        totalTranslated: 0,
        totalSkipped: 0,
        totalErrors: 0,
        averageTime: 0,
        cacheHitRate: 0
      };
    }

    const totalJobs = session.batches.reduce((sum, batch) => sum + batch.jobs.length, 0);
    const completedJobs = session.translatedStrings;
    const totalTime = session.endTime ? session.endTime - (session.startTime || 0) : Date.now() - (session.startTime || 0);
    
    const cacheStats = await cacheService.getStats();
    const cacheHitRate = totalJobs > 0 ? (cacheStats.memorySize + cacheStats.indexedDBSize) / totalJobs : 0;

    return {
      totalProcessed: totalJobs,
      totalTranslated: completedJobs,
      totalSkipped: session.skippedStrings,
      totalErrors: session.errorStrings,
      averageTime: totalJobs > 0 ? totalTime / totalJobs : 0,
      cacheHitRate: Math.min(cacheHitRate, 1) // Cap at 100%
    };
  }

  isTranslationInProgress(): boolean {
    return this.isProcessing;
  }

  canResume(): boolean {
    return this.currentSession?.status === 'paused' && !this.isProcessing;
  }
}

export const translationService = new TranslationService();
