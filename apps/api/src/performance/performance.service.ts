import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class PerformanceService {
    private redis: Redis;
    private readonly cacheTTL = 3600; // 1 hour default TTL

    constructor(private configService: ConfigService) {
        this.redis = new Redis({
            host: this.configService.get('REDIS_HOST', 'localhost'),
            port: parseInt(this.configService.get('REDIS_PORT', '6379')),
            password: this.configService.get('REDIS_PASSWORD'),
            db: parseInt(this.configService.get('REDIS_DB', '0')),
        });
    }

    // Caching methods
    async getCachedData(key: string): Promise<any | null> {
        try {
            const data = await this.redis.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    async setCachedData(key: string, data: any, ttl: number = this.cacheTTL): Promise<void> {
        try {
            await this.redis.setex(key, ttl, JSON.stringify(data));
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    async invalidateCache(key: string): Promise<void> {
        try {
            await this.redis.del(key);
        } catch (error) {
            console.error('Cache delete error:', error);
        }
    }

    async invalidateCachePattern(pattern: string): Promise<void> {
        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        } catch (error) {
            console.error('Cache pattern delete error:', error);
        }
    }

    // Rate limiting
    async checkRateLimit(
        identifier: string,
        action: string,
        limit: number,
        windowSeconds: number,
    ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
        const key = `ratelimit:${action}:${identifier}`;
        const now = Date.now();
        const windowStart = Math.floor(now / 1000 / windowSeconds) * windowSeconds;

        try {
            const pipeline = this.redis.pipeline();
            pipeline.zremrangebyscore(key, 0, windowStart - windowSeconds);
            pipeline.zadd(key, now, now.toString());
            pipeline.zcount(key, windowStart, '+inf');
            pipeline.expire(key, windowSeconds * 2);

            const results = await pipeline.exec();
            const requestCount = results[2][1] as number;

            const allowed = requestCount <= limit;
            const remaining = Math.max(0, limit - requestCount);
            const resetTime = (windowStart + windowSeconds) * 1000;

            return { allowed, remaining, resetTime };
        } catch (error) {
            console.error('Rate limit check error:', error);
            return { allowed: true, remaining: limit, resetTime: 0 };
        }
    }

    // Circuit breaker
    async checkCircuitBreaker(
        serviceName: string,
        failureThreshold: number = 5,
        recoveryTimeout: number = 60000,
    ): Promise<boolean> {
        const failureKey = `circuit:${serviceName}:failures`;
        const stateKey = `circuit:${serviceName}:state`;

        try {
            const [failureCount, state] = await Promise.all([
                this.redis.get(failureKey),
                this.redis.get(stateKey),
            ]);

            const failures = parseInt(failureCount || '0');

            // If circuit is open, check if recovery timeout has passed
            if (state === 'open') {
                const lastFailureTime = await this.redis.get(`circuit:${serviceName}:last_failure`);
                if (lastFailureTime && Date.now() - parseInt(lastFailureTime) > recoveryTimeout) {
                    // Try to close circuit (half-open state)
                    await this.redis.set(stateKey, 'half-open');
                    return true;
                }
                return false;
            }

            // If circuit is half-open and we get here, it means the test request succeeded
            if (state === 'half-open') {
                await this.redis.set(stateKey, 'closed');
                await this.redis.del(failureKey);
                return true;
            }

            return true;
        } catch (error) {
            console.error('Circuit breaker check error:', error);
            return true; // Fail open
        }
    }

    async recordCircuitBreakerFailure(serviceName: string): Promise<void> {
        const failureKey = `circuit:${serviceName}:failures`;
        const stateKey = `circuit:${serviceName}:state`;

        try {
            const failures = await this.redis.incr(failureKey);
            await this.redis.set(`circuit:${serviceName}:last_failure`, Date.now());

            if (failures >= 5) {
                await this.redis.set(stateKey, 'open');
            }
        } catch (error) {
            console.error('Circuit breaker failure recording error:', error);
        }
    }

    // Distributed locking
    async acquireLock(
        key: string,
        ttl: number = 30000,
        retryCount: number = 3,
        retryDelay: number = 100,
    ): Promise<string | null> {
        const lockId = `${Date.now()}-${Math.random()}`;

        for (let i = 0; i < retryCount; i++) {
            try {
                const result = await this.redis.set(key, lockId, 'NX', 'PX', ttl);
                if (result === 'OK') {
                    return lockId;
                }
            } catch (error) {
                console.error('Lock acquisition error:', error);
            }

            if (i < retryCount - 1) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }

        return null;
    }

    async releaseLock(key: string, lockId: string): Promise<boolean> {
        try {
            const script = `
        if redis.call('get', KEYS[1]) == ARGV[1] then
          return redis.call('del', KEYS[1])
        else
          return 0
        end
      `;

            const result = await this.redis.eval(script, 1, key, lockId);
            return result === 1;
        } catch (error) {
            console.error('Lock release error:', error);
            return false;
        }
    }

    // Queue management for background jobs
    async enqueueJob(queueName: string, jobData: any, priority: number = 0): Promise<string> {
        try {
            const jobId = `job:${Date.now()}:${Math.random()}`;
            const job = {
                id: jobId,
                data: jobData,
                priority,
                createdAt: Date.now(),
                status: 'queued',
            };

            await this.redis.zadd(`${queueName}:queue`, priority, JSON.stringify(job));
            await this.redis.hset(`${queueName}:jobs`, jobId, JSON.stringify(job));

            return jobId;
        } catch (error) {
            console.error('Job enqueue error:', error);
            throw error;
        }
    }

    async dequeueJob(queueName: string): Promise<any | null> {
        try {
            const result = await this.redis.zpopmin(`${queueName}:queue`);
            if (result.length === 0) {
                return null;
            }

            const job = JSON.parse(result[0]);
            await this.redis.hset(`${queueName}:jobs`, job.id, JSON.stringify({
                ...job,
                status: 'processing',
                startedAt: Date.now(),
            }));

            return job;
        } catch (error) {
            console.error('Job dequeue error:', error);
            return null;
        }
    }

    async completeJob(queueName: string, jobId: string, result?: any): Promise<void> {
        try {
            const jobStr = await this.redis.hget(`${queueName}:jobs`, jobId);
            if (jobStr) {
                const job = JSON.parse(jobStr);
                const completedJob = {
                    ...job,
                    status: 'completed',
                    completedAt: Date.now(),
                    result,
                };
                await this.redis.hset(`${queueName}:jobs`, jobId, JSON.stringify(completedJob));
            }
        } catch (error) {
            console.error('Job completion error:', error);
        }
    }

    async failJob(queueName: string, jobId: string, error: string): Promise<void> {
        try {
            const jobStr = await this.redis.hget(`${queueName}:jobs`, jobId);
            if (jobStr) {
                const job = JSON.parse(jobStr);
                const failedJob = {
                    ...job,
                    status: 'failed',
                    failedAt: Date.now(),
                    error,
                };
                await this.redis.hset(`${queueName}:jobs`, jobId, JSON.stringify(failedJob));
            }
        } catch (err) {
            console.error('Job failure recording error:', err);
        }
    }

    // Performance monitoring
    async recordResponseTime(endpoint: string, method: string, duration: number): Promise<void> {
        try {
            const key = `performance:${endpoint}:${method}`;
            await this.redis.lpush(key, duration);
            await this.redis.ltrim(key, 0, 99); // Keep last 100 measurements
            await this.redis.expire(key, 86400); // Expire after 24 hours
        } catch (error) {
            console.error('Response time recording error:', error);
        }
    }

    async getAverageResponseTime(endpoint: string, method: string): Promise<number> {
        try {
            const key = `performance:${endpoint}:${method}`;
            const times = await this.redis.lrange(key, 0, -1);
            if (times.length === 0) return 0;

            const sum = times.reduce((acc, time) => acc + parseFloat(time), 0);
            return sum / times.length;
        } catch (error) {
            console.error('Average response time calculation error:', error);
            return 0;
        }
    }

    // Cleanup methods
    async cleanupExpiredLocks(): Promise<void> {
        try {
            // This would be called by a scheduled job
            const lockKeys = await this.redis.keys('lock:*');
            for (const key of lockKeys) {
                const ttl = await this.redis.pttl(key);
                if (ttl === -2) { // Key doesn't exist
                    continue;
                }
                if (ttl === -1) { // Key has no TTL
                    await this.redis.del(key);
                }
            }
        } catch (error) {
            console.error('Lock cleanup error:', error);
        }
    }

    async getHealthStatus(): Promise<any> {
        try {
            const info = await this.redis.info();
            const ping = await this.redis.ping();

            return {
                status: 'healthy',
                ping: ping === 'PONG',
                info: {
                    connected_clients: info.match(/connected_clients:(\d+)/)?.[1],
                    used_memory: info.match(/used_memory:(\d+)/)?.[1],
                    total_connections_received: info.match(/total_connections_received:(\d+)/)?.[1],
                },
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
            };
        }
    }
}
