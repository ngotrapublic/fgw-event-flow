const LEGACY_KEY = 'borrowTokens';

/**
 * Legacy Borrow Token Store cleanup helper.
 * Guest access now uses short-lived HttpOnly session cookies issued by the server;
 * this helper actively removes any old localStorage tokens left from prior versions.
 */
export const borrowTokenStore = {
    purgeLegacy() {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem(LEGACY_KEY);
            }
        } catch {
            // ignore storage errors
        }
    },
    clear() {
        this.purgeLegacy();
        return [];
    }
};

export default borrowTokenStore;
