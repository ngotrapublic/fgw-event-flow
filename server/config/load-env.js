const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const PLACEHOLDER_MARKERS = [
    'your-project-id',
    'your-dev-project-id',
    'your-staging-project-id',
    'your-production-project-id',
    'YOUR_PRIVATE_KEY_HERE',
    'YOUR_DEV_PRIVATE_KEY_HERE',
    'YOUR_STAGING_PRIVATE_KEY_HERE',
    'YOUR_PRODUCTION_PRIVATE_KEY_HERE',
    'your-app-password',
    'your-dev-app-password',
    'your-staging-app-password',
    'your-production-app-password'
];

function isTemplatePlaceholder(value) {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return true;
    return PLACEHOLDER_MARKERS.some((marker) => trimmed.includes(marker));
}

function dedupeDirs(dirs) {
    const seen = new Set();
    const out = [];
    for (const d of dirs) {
        if (!d) continue;
        const resolved = path.resolve(d);
        if (!seen.has(resolved)) {
            seen.add(resolved);
            out.push(resolved);
        }
    }
    return out;
}

function hasAnyEnvFile(dir) {
    const names = ['.env', '.env.production', '.env.staging', '.env.development', '.env.test'];
    return names.some((n) => fs.existsSync(path.join(dir, n)));
}

function readEnvFile(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return null;
    return dotenv.parse(fs.readFileSync(filePath, 'utf8'));
}

function applyEnvValues(parsed, targetEnv, { skipPlaceholders = false } = {}) {
    if (!parsed) return;
    for (const [key, val] of Object.entries(parsed)) {
        if (targetEnv[key] !== undefined && targetEnv[key] !== '') {
            continue;
        }
        if (skipPlaceholders && isTemplatePlaceholder(val)) {
            continue;
        }
        targetEnv[key] = val;
    }
}

/**
 * Resolve & load environment files in deterministic order BEFORE security validation or Firebase init.
 *
 * Precedence (never overrides variables already provided by the OS / Docker container):
 *  1. Explicit ENV_FILE (if set)
 *  2. Mode-specific file: .env.<NODE_ENV> (where NODE_ENV can come from OS, .env, or .env.production)
 *  3. Generic .env
 *
 * Also supports isolated execution from a custom CWD containing its own .env* (e.g. non-Docker prod deploy
 * or isolated startup tests) without leaking host repository .env files.
 */
function loadEnv({
    cwd = process.cwd(),
    serverDir = path.resolve(__dirname, '..'),
    rootDir = path.resolve(__dirname, '..', '..'),
    env = process.env
} = {}) {
    let searchDirs;
    if (typeof env.APP_ENV_DIR === 'string' && env.APP_ENV_DIR.trim()) {
        searchDirs = dedupeDirs([env.APP_ENV_DIR.trim()]);
    } else {
        const cwdNorm = path.resolve(cwd);
        const serverNorm = path.resolve(serverDir);
        const rootNorm = path.resolve(rootDir);
        if (cwdNorm !== serverNorm && cwdNorm !== rootNorm && hasAnyEnvFile(cwdNorm)) {
            searchDirs = [cwdNorm];
        } else {
            searchDirs = dedupeDirs([cwdNorm, serverNorm, rootNorm]);
        }
    }

    const explicitFile =
        typeof env.ENV_FILE === 'string' && env.ENV_FILE.trim()
            ? path.resolve(cwd, env.ENV_FILE.trim())
            : null;

    // Pass 1: Determine target NODE_ENV even if only declared inside .env or .env.production
    let targetEnv = typeof env.NODE_ENV === 'string' && env.NODE_ENV.trim() ? env.NODE_ENV.trim() : '';

    if (!targetEnv && explicitFile) {
        const parsed = readEnvFile(explicitFile);
        if (parsed?.NODE_ENV && parsed.NODE_ENV.trim()) {
            targetEnv = parsed.NODE_ENV.trim();
        }
    }

    if (!targetEnv) {
        for (const dir of searchDirs) {
            const dotEnv = readEnvFile(path.join(dir, '.env'));
            if (dotEnv?.NODE_ENV && dotEnv.NODE_ENV.trim()) {
                targetEnv = dotEnv.NODE_ENV.trim();
                break;
            }
        }
    }

    if (!targetEnv) {
        for (const dir of searchDirs) {
            const prodEnv = readEnvFile(path.join(dir, '.env.production'));
            if (prodEnv) {
                targetEnv =
                    prodEnv.NODE_ENV && prodEnv.NODE_ENV.trim() ? prodEnv.NODE_ENV.trim() : 'production';
                break;
            }
        }
    }

    if (!targetEnv) {
        targetEnv = 'development';
    }

    const loadedFiles = [];

    if (explicitFile) {
        const parsed = readEnvFile(explicitFile);
        if (parsed) {
            applyEnvValues(parsed, env);
            loadedFiles.push(explicitFile);
        }
    }

    // Never pull repository .env / .env.production when running unit tests unless ENV_FILE or .env.test was requested
    if (targetEnv === 'test') {
        for (const dir of searchDirs) {
            const candidate = path.join(dir, '.env.test');
            const parsed = readEnvFile(candidate);
            if (parsed) {
                applyEnvValues(parsed, env);
                loadedFiles.push(candidate);
            }
        }
        return { nodeEnv: targetEnv, loadedFiles, searchDirs };
    }

    const modeFile = `.env.${targetEnv}`;

    // Pass 2: Load mode-specific env file(s) BEFORE generic .env (never overriding real OS env vars)
    for (const dir of searchDirs) {
        const candidate = path.join(dir, modeFile);
        const parsed = readEnvFile(candidate);
        if (parsed) {
            applyEnvValues(parsed, env, { skipPlaceholders: targetEnv === 'development' });
            loadedFiles.push(candidate);
        }
    }

    for (const dir of searchDirs) {
        const candidate = path.join(dir, '.env');
        const parsed = readEnvFile(candidate);
        if (parsed) {
            applyEnvValues(parsed, env);
            loadedFiles.push(candidate);
        }
    }

    if (!env.NODE_ENV && targetEnv) {
        env.NODE_ENV = targetEnv;
    }

    return { nodeEnv: env.NODE_ENV || targetEnv, loadedFiles, searchDirs };
}

module.exports = {
    loadEnv,
    isTemplatePlaceholder
};

