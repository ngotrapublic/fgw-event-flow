const KEY = 'borrowTokens';
const MAX = 10;

/**
 * Borrow Token Store
 * Manages guest and client access tokens stored in localStorage.
 * Only stores token strings, capped at 10 items.
 */
export const borrowTokenStore = {
    load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.filter((t) => typeof t === 'string' && t.trim().length > 0);
        } catch {
            return [];
        }
    },

    save(tokens) {
        try {
            if (!Array.isArray(tokens)) return [];
            // Deduplicate while preserving order
            const unique = Array.from(
                new Set(tokens.filter((t) => typeof t === 'string' && t.trim().length > 0))
            ).slice(0, MAX);
            localStorage.setItem(KEY, JSON.stringify(unique));
            return unique;
        } catch {
            return [];
        }
    },

    add(token) {
        if (!token || typeof token !== 'string') return this.load();
        const clean = token.trim();
        if (!clean) return this.load();

        const current = this.load();
        const updated = [clean, ...current.filter((t) => t !== clean)].slice(0, MAX);
        return this.save(updated);
    },

    addMany(tokens) {
        if (!Array.isArray(tokens) || tokens.length === 0) return this.load();
        const cleanTokens = tokens
            .filter((t) => typeof t === 'string' && t.trim().length > 0)
            .map((t) => t.trim());

        const current = this.load();
        const updated = [...cleanTokens, ...current].slice(0, MAX);
        return this.save(updated);
    },

    remove(tokensToRemove) {
        if (!tokensToRemove) return this.load();
        const toRemove = Array.isArray(tokensToRemove) ? tokensToRemove : [tokensToRemove];
        const removeSet = new Set(toRemove.map((t) => String(t).trim()));

        const current = this.load();
        const updated = current.filter((t) => !removeSet.has(t));
        return this.save(updated);
    },

    clear() {
        try {
            localStorage.removeItem(KEY);
        } catch {
            // ignore storage errors
        }
        return [];
    }
};

export default borrowTokenStore;

