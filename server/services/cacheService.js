const logger = require('../utils/logger') || console;

/**
 * In-Memory Cache Service with Smart Invalidation, Promise Deduplication, and Stale-While-Revalidate
 */
class CacheService {
    constructor() {
        this.cache = new Map();
        this.pending = new Map(); // For Promise Deduplication
    }

    /**
     * Get data from cache or fetch it
     * @param {string} key Cache key
     * @param {Function} fetchFn Promise returning function
     * @param {number} ttlMinutes TTL in minutes
     * @returns {Promise<any>}
     */
    async getOrFetch(key, fetchFn, ttlMinutes = 60) {
        const now = Date.now();
        const cached = this.cache.get(key);

        // 1. Cache HIT
        if (cached && cached.expiresAt > now) {
            logger.info(`[CACHE HIT] ${key}`);
            return cached.data;
        }

        // 2. Promise Deduplication (Stampede protection)
        if (this.pending.has(key)) {
            logger.info(`[CACHE DEDUP] Waiting for existing fetch for ${key}`);
            try {
                return await this.pending.get(key);
            } catch (err) {
                // Ignore pending error, continue to fetch or fallback
            }
        }

        // 3. Cache MISS or STALE
        logger.info(`[CACHE MISS] Fetching fresh data for ${key}`);
        const fetchPromise = (async () => {
            try {
                const newData = await fetchFn();
                this.cache.set(key, {
                    data: newData,
                    expiresAt: now + (ttlMinutes * 60 * 1000)
                });
                return newData;
            } catch (error) {
                // 4. Stale-While-Revalidate
                if (cached) {
                    logger.warn(`[CACHE WARNING] Fetch failed for ${key}, using STALE data. Error: ${error.message}`);
                    return cached.data;
                }
                logger.error(`[CACHE ERROR] Fetch failed for ${key} and no stale data available. Error: ${error.message}`);
                throw error;
            } finally {
                this.pending.delete(key);
            }
        })();

        this.pending.set(key, fetchPromise);
        return fetchPromise;
    }

    /**
     * Delete a specific cache key
     * @param {string} key 
     */
    invalidate(key) {
        logger.info(`[CACHE INVALIDATED] ${key}`);
        this.cache.delete(key);
    }

    /**
     * Invalidate all analytics cache keys (they use dynamic date-range suffixes)
     */
    clearAnalytics() {
        for (const key of this.cache.keys()) {
            if (key.startsWith('analytics_')) {
                logger.info(`[CACHE INVALIDATED] ${key}`);
                this.cache.delete(key);
            }
        }
    }

    /**
     * Invalidate all events-related dynamic cache keys (calendar, etc.)
     */
    clearEventsCache() {
        for (const key of this.cache.keys()) {
            if (key.startsWith('calendar_')) {
                logger.info(`[CACHE INVALIDATED] ${key}`);
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all cache
     */
    clearAll() {
        logger.info(`[CACHE] Cleared ALL cache`);
        this.cache.clear();
        this.pending.clear();
    }
}

module.exports = new CacheService();
