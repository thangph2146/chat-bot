// ==================== DIFY SERVICE LAYER ====================
// Xử lý retry logic, rate limiting và error handling cho Dify API

import { postDifyChatStream, postDifyChat, DifyChatRequest, DifyChatResponse, DifyStreamingCallbacks } from '@/lib/axios/call-api-dify';

// ==================== TYPES ====================
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
}

export interface DifyServiceConfig {
  retry: RetryConfig;
  rateLimit: RateLimitConfig;
}

// ==================== RATE LIMITING ====================
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequestsPerMinute: number;
  private readonly maxRequestsPerHour: number;

  constructor(config: RateLimitConfig) {
    this.maxRequestsPerMinute = config.maxRequestsPerMinute;
    this.maxRequestsPerHour = config.maxRequestsPerHour;
  }

  private cleanup(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    this.requests = this.requests.filter(timestamp => timestamp > oneHourAgo);
  }

  canMakeRequest(): boolean {
    this.cleanup();
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    const requestsInLastMinute = this.requests.filter(timestamp => timestamp > oneMinuteAgo).length;
    const requestsInLastHour = this.requests.filter(timestamp => timestamp > oneHourAgo).length;

    return requestsInLastMinute < this.maxRequestsPerMinute && requestsInLastHour < this.maxRequestsPerHour;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  getWaitTime(): number {
    this.cleanup();
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    const requestsInLastMinute = this.requests.filter(timestamp => timestamp > oneMinuteAgo).length;
    const requestsInLastHour = this.requests.filter(timestamp => timestamp > oneHourAgo).length;

    if (requestsInLastMinute >= this.maxRequestsPerMinute) {
      const oldestRequestInMinute = Math.min(...this.requests.filter(timestamp => timestamp > oneMinuteAgo));
      return Math.max(0, 60000 - (now - oldestRequestInMinute));
    }

    if (requestsInLastHour >= this.maxRequestsPerHour) {
      const oldestRequestInHour = Math.min(...this.requests.filter(timestamp => timestamp > oneHourAgo));
      return Math.max(0, 3600000 - (now - oldestRequestInHour));
    }

    return 0;
  }
}

// ==================== RETRY LOGIC ====================
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const calculateBackoffDelay = (attempt: number, config: RetryConfig): number => {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelay);
};

const shouldRetry = (error: Error): boolean => {
  // Retry on network errors
  return error.name === 'TypeError' || error.name === 'AbortError';
};

// ==================== DIFY SERVICE CLASS ====================
export class DifyService {
  private rateLimiter: RateLimiter;
  private config: DifyServiceConfig;

  constructor(config: DifyServiceConfig) {
    this.config = config;
    this.rateLimiter = new RateLimiter(config.rateLimit);
  }

  // ==================== RATE LIMITING ====================
  private async waitForRateLimit(): Promise<void> {
    if (!this.rateLimiter.canMakeRequest()) {
      const waitTime = this.rateLimiter.getWaitTime();
      if (waitTime > 0) {
        console.log(`Rate limit reached, waiting ${waitTime}ms`);
        await sleep(waitTime);
      }
    }
  }

  // ==================== STREAMING CHAT WITH RETRY ====================
  async streamChatWithRetry(
    request: DifyChatRequest,
    callbacks: DifyStreamingCallbacks
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retry.maxRetries; attempt++) {
      try {
        // Wait for rate limit
        await this.waitForRateLimit();

        // Record request for rate limiting
        this.rateLimiter.recordRequest();

        // Make the request using call-api-dify.ts
        await postDifyChatStream(request, callbacks);
        return; // Success, exit retry loop

      } catch (error) {
        lastError = error as Error;
        console.error(`Dify request failed (attempt ${attempt}/${this.config.retry.maxRetries}):`, error);

        // Don't retry if it's not a retryable error
        if (!shouldRetry(error as Error)) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === this.config.retry.maxRetries) {
          break;
        }

        // Calculate delay for next retry
        const delay = calculateBackoffDelay(attempt, this.config.retry);
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }

    // All retries failed
    throw lastError || new Error('All retry attempts failed');
  }

  // ==================== BLOCKING CHAT WITH RETRY ====================
  async chatWithRetry(request: DifyChatRequest): Promise<DifyChatResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retry.maxRetries; attempt++) {
      try {
        // Wait for rate limit
        await this.waitForRateLimit();

        // Record request for rate limiting
        this.rateLimiter.recordRequest();

        // Make the request using call-api-dify.ts
        return await postDifyChat(request);

      } catch (error) {
        lastError = error as Error;
        console.error(`Dify request failed (attempt ${attempt}/${this.config.retry.maxRetries}):`, error);

        // Don't retry if it's not a retryable error
        if (!shouldRetry(error as Error)) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === this.config.retry.maxRetries) {
          break;
        }

        // Calculate delay for next retry
        const delay = calculateBackoffDelay(attempt, this.config.retry);
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }

    // All retries failed
    throw lastError || new Error('All retry attempts failed');
  }

  // ==================== GET SERVICE STATUS ====================
  getServiceStatus(): {
    rateLimitInfo: {
      canMakeRequest: boolean;
      waitTime: number;
    };
  } {
    return {
      rateLimitInfo: {
        canMakeRequest: this.rateLimiter.canMakeRequest(),
        waitTime: this.rateLimiter.getWaitTime(),
      },
    };
  }
}

// ==================== DEFAULT CONFIGURATION ====================
const defaultConfig: DifyServiceConfig = {
  retry: {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2,
  },
  rateLimit: {
    maxRequestsPerMinute: 60,
    maxRequestsPerHour: 1000,
  },
};

// ==================== SINGLETON INSTANCE ====================
export const difyService = new DifyService(defaultConfig);

// Re-export types for convenience
export type { DifyChatRequest, DifyChatResponse, DifyStreamingCallbacks } from '@/lib/axios/call-api-dify'; 