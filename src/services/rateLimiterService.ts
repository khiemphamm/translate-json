import { RateLimiter } from '@/types/translation';

class RateLimiterService {
  private limiter: RateLimiter;

  constructor() {
    this.limiter = {
      requests: [],
      maxRequests: parseInt(process.env.NEXT_PUBLIC_MAX_REQUESTS_PER_MINUTE || '60', 10),
      windowMs: 60000 // 1 minute
    };
  }

  async waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        this.cleanupOldRequests();
        
        if (this.limiter.requests.length < this.limiter.maxRequests) {
          this.limiter.requests.push(Date.now());
          resolve();
        } else {
          // Calculate wait time until oldest request expires
          const oldestRequest = Math.min(...this.limiter.requests);
          const waitTime = Math.max(0, (oldestRequest + this.limiter.windowMs) - Date.now());
          setTimeout(checkSlot, Math.min(waitTime, 1000)); // Check at least every second
        }
      };
      
      checkSlot();
    });
  }

  private cleanupOldRequests(): void {
    const now = Date.now();
    this.limiter.requests = this.limiter.requests.filter(
      timestamp => now - timestamp < this.limiter.windowMs
    );
  }

  getRemainingRequests(): number {
    this.cleanupOldRequests();
    return Math.max(0, this.limiter.maxRequests - this.limiter.requests.length);
  }

  getResetTime(): number {
    if (this.limiter.requests.length === 0) {
      return 0;
    }
    
    const oldestRequest = Math.min(...this.limiter.requests);
    return oldestRequest + this.limiter.windowMs;
  }

  reset(): void {
    this.limiter.requests = [];
  }

  getStats(): { currentRequests: number; maxRequests: number; windowMs: number; resetTime: number } {
    this.cleanupOldRequests();
    return {
      currentRequests: this.limiter.requests.length,
      maxRequests: this.limiter.maxRequests,
      windowMs: this.limiter.windowMs,
      resetTime: this.getResetTime()
    };
  }
}

export const rateLimiterService = new RateLimiterService();
