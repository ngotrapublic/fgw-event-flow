/**
 * In-memory Firestore mock for unit testing controllers/services.
 * Supports the chained query API used by eventController:
 *   collection.where().where().orderBy().startAfter().limit().get()
 *   collection.count().get(), collection.doc(id).get()/update(), db.batch()
 */

// Resolve dotted Firestore field paths like 'borrower.phone'
const getPath = (data, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), data);

class MockTimestamp {
    constructor(seconds, nanoseconds = 0) {
        this.seconds = Number(seconds) || 0;
        this.nanoseconds = Number(nanoseconds) || 0;
    }

    static fromDate(date) {
        const d = date instanceof Date ? date : new Date(date);
        return MockTimestamp.fromMillis(d.getTime());
    }

    static fromMillis(ms) {
        const num = Number(ms) || 0;
        const seconds = Math.floor(num / 1000);
        const nanoseconds = Math.max(0, (num - seconds * 1000) * 1e6);
        return new MockTimestamp(seconds, nanoseconds);
    }

    static now() {
        return MockTimestamp.fromMillis(Date.now());
    }

    toMillis() {
        return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
    }

    toDate() {
        return new Date(this.toMillis());
    }

    valueOf() {
        return this.toMillis();
    }
}

const normalizeComparable = (val) => {
    if (val === undefined || val === null) return val;
    if (typeof val?.toMillis === 'function') return val.toMillis();
    if (val instanceof Date) return val.getTime();
    if (typeof val === 'object' && typeof val.seconds === 'number' && typeof val.nanoseconds === 'number') {
        return val.seconds * 1000 + Math.floor(val.nanoseconds / 1e6);
    }
    return val;
};

const setNested = (obj, path, val) => {
    const parts = path.split('.');
    let curr = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!curr[parts[i]] || typeof curr[parts[i]] !== 'object') curr[parts[i]] = {};
        curr = curr[parts[i]];
    }
    curr[parts[parts.length - 1]] = val;
};

const matchesWhere = (data, [field, op, val]) => {
    const rawV = getPath(data, field);
    const v = normalizeComparable(rawV);
    const target = Array.isArray(val) ? val : normalizeComparable(val);
    switch (op) {
        case '==': return v === target;
        case 'in': return Array.isArray(val) && val.map(normalizeComparable).includes(v);
        case '>=': return v >= target;
        case '<=': return v <= target;
        case '<': return v < target;
        case '>': return v > target;
        case 'array-contains': return Array.isArray(rawV) && rawV.includes(val);
        case 'array-contains-any':
            return Array.isArray(rawV) && Array.isArray(val) && rawV.some((item) => val.includes(item));
        default: throw new Error(`Unsupported where op: ${op}`);
    }
};

const makeDocSnap = (id, data, ref) => ({
    id,
    exists: data !== undefined,
    data: () => data,
    ref
});

const execute = (store, state) => {
    let rows = [...store.entries()].map(([id, data]) => ({ id, data }));
    for (const f of state.filters) rows = rows.filter(r => matchesWhere(r.data, f));

    // Apply orderBy(s). Firestore adds implicit __name__ ordering after the
    // last explicit orderBy, with the same direction.
    const orders = [...state.orders];
    if (orders.length > 0) {
        const lastDir = orders[orders.length - 1][1] === 'desc' ? 'desc' : 'asc';
        orders.push(['__id__', lastDir]);
    }
    rows.sort((a, b) => {
        for (const [field, dir] of orders) {
            const va = field === '__id__' ? a.id : normalizeComparable(getPath(a.data, field));
            const vb = field === '__id__' ? b.id : normalizeComparable(getPath(b.data, field));
            const cmp = va === vb ? 0 : (va < vb ? -1 : 1);
            if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
        }
        return 0;
    });

    if (state.after) {
        const idx = rows.findIndex(r => r.id === state.after.id);
        if (idx >= 0) rows = rows.slice(idx + 1);
    }
    if (state.limitN != null) rows = rows.slice(0, state.limitN);
    return rows;
};

const makeQuery = (store, state) => ({
    where: (f, o, v) => makeQuery(store, { ...state, filters: [...state.filters, [f, o, v]] }),
    orderBy: (f, dir = 'asc') => makeQuery(store, { ...state, orders: [...state.orders, [f, dir]] }),
    startAfter: (snap) => makeQuery(store, { ...state, after: snap }),
    limit: (n) => makeQuery(store, { ...state, limitN: n }),
    count: () => ({
        get: async () => ({ data: () => ({ count: execute(store, state).length }) })
    }),
    get: async () => {
        const rows = execute(store, state);
        const snaps = rows.map(r => makeDocSnap(r.id, r.data, makeDocRef(store, r.id)));
        return {
            docs: snaps,
            size: snaps.length,
            empty: snaps.length === 0,
            forEach: (fn) => snaps.forEach(fn)
        };
    }
});

let autoId = 0;
const makeDocRef = (store, id) => ({
    id,
    __store: store,
    get: async () => makeDocSnap(id, store.get(id), makeDocRef(store, id)),
    set: async (data, opts) => {
        if (opts && opts.merge && store.has(id)) {
            const merged = { ...store.get(id) };
            for (const [k, v] of Object.entries(data)) {
                merged[k] = (v && v.__increment) ? (merged[k] || 0) + v.__increment : v;
            }
            store.set(id, merged);
        } else {
            store.set(id, data);
        }
    },
    update: async (data) => {
        const current = store.get(id) || {};
        const updated = JSON.parse(JSON.stringify(current));
        for (const [k, v] of Object.entries(data)) {
            const finalVal = (v && v.__increment) ? (getPath(current, k) || 0) + v.__increment : v;
            if (k.includes('.')) {
                setNested(updated, k, finalVal);
            } else {
                updated[k] = finalVal;
            }
        }
        store.set(id, updated);
    },
    delete: async () => store.delete(id)
});

const makeCollection = (store) => ({
    __store: store,
    where: (f, o, v) => makeQuery(store, { filters: [[f, o, v]], orders: [], after: null, limitN: null }),
    orderBy: (f, dir = 'asc') => makeQuery(store, { filters: [], orders: [[f, dir]], after: null, limitN: null }),
    limit: (n) => makeQuery(store, { filters: [], orders: [], after: null, limitN: n }),
    doc: (id) => makeDocRef(store, id !== undefined ? id : `auto_${++autoId}`),
    add: async (data) => { const id = `add_${++autoId}`; store.set(id, data); return makeDocRef(store, id); },
    get: async () => makeQuery(store, { filters: [], orders: [], after: null, limitN: null }).get()
});

const makeBatch = () => {
    const ops = [];
    return {
        set: (ref, data) => ops.push(['set', ref, data]),
        update: (ref, data) => ops.push(['update', ref, data]),
        delete: (ref) => ops.push(['delete', ref]),
        commit: async () => {
            for (const [op, ref, data] of ops) {
                if (op === 'set') await ref.set(data);
                else if (op === 'update') await ref.update(data);
                else if (op === 'delete') await ref.delete();
            }
        },
        __ops: ops
    };
};

/**
 * Build a mock of server/config/firebase.js.
 * seed: { events: {id: data}, users: {id: data}, metadata: {id: data}, ... }
 */
const buildFirebaseMock = (seed = {}) => {
    const stores = {};
    for (const name of Object.keys(seed)) stores[name] = new Map(Object.entries(seed[name]));

    const collections = {};
    const db = {
        collection: (name) => {
            if (!collections[name]) collections[name] = makeCollection(stores[name] || (stores[name] = new Map()));
            return collections[name];
        },
        batch: () => makeBatch(),
        runTransaction: async (fn) => {
            // Serialise transactions so concurrent calls behave like Firestore retries
            const run = (db.__txChain || Promise.resolve()).then(async () => {
                const writes = [];
                const tx = {
                    get: async (refOrQuery) => refOrQuery.get(),
                    set: (ref, data, opts) => writes.push(() => ref.set(data, opts)),
                    update: (ref, data) => writes.push(() => ref.update(data)),
                    delete: (ref) => writes.push(() => ref.delete())
                };
                const result = await fn(tx);
                for (const w of writes) await w();
                return result;
            });
            db.__txChain = run.catch(() => {});
            return run;
        }
    };

    return {
        db,
        admin: {
            firestore: {
                Timestamp: MockTimestamp,
                FieldValue: { increment: (n) => ({ __increment: n }), delete: () => ({ __delete: true }) }
            }
        },
        eventsCollection: db.collection('events'),
        departmentsCollection: db.collection('departments'),
        resourcesCollection: db.collection('resources'),
        auditLogsCollection: db.collection('audit_logs'),
        borrowRequestsCollection: db.collection('borrow_requests'),
        borrowOtpsCollection: db.collection('borrow_otps'),
        borrowSessionsCollection: db.collection('borrow_sessions'),
        borrowLinkCodesCollection: db.collection('borrow_link_codes'),
        borrowQuotasCollection: db.collection('borrow_quotas'),
        borrowReminderOutboxCollection: db.collection('borrow_reminder_outbox'),
        borrowIdempotencyCollection: db.collection('borrow_idempotency'),
        __stores: stores
    };
};

module.exports = { buildFirebaseMock, getPath };
