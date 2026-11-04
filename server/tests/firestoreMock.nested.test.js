/**
 * Unit test for enhanced firestoreMock (Phase 00 prerequisites)
 * Tests nested path querying (e.g. 'borrower.phone'), runTransaction, and increment in update.
 */

const { buildFirebaseMock, getPath } = require('./helpers/firestoreMock');

describe('firestoreMock enhancements', () => {
    test('getPath resolves nested properties correctly', () => {
        const obj = { a: { b: { c: 42 } }, x: null };
        expect(getPath(obj, 'a.b.c')).toBe(42);
        expect(getPath(obj, 'a.b')).toEqual({ c: 42 });
        expect(getPath(obj, 'x.y')).toBeUndefined();
        expect(getPath(obj, 'non.existent')).toBeUndefined();
    });

    test("where('a.b', '==', 1) finds doc with { a: { b: 1 } }", async () => {
        const mock = buildFirebaseMock({
            test_items: {
                doc1: { a: { b: 1 }, name: 'match' },
                doc2: { a: { b: 2 }, name: 'no-match' },
                doc3: { name: 'missing' }
            }
        });

        const snap = await mock.db.collection('test_items').where('a.b', '==', 1).get();
        expect(snap.size).toBe(1);
        expect(snap.docs[0].id).toBe('doc1');
        expect(snap.docs[0].data().name).toBe('match');
    });

    test('runTransaction executes reads and writes sequentially', async () => {
        const mock = buildFirebaseMock({
            accounts: {
                acc1: { balance: 100 }
            }
        });

        const res = await mock.db.runTransaction(async (tx) => {
            const ref = mock.db.collection('accounts').doc('acc1');
            const snap = await tx.get(ref);
            const currentBalance = snap.data().balance;
            tx.update(ref, { balance: currentBalance + 50 });
            return currentBalance + 50;
        });

        expect(res).toBe(150);
        const finalSnap = await mock.db.collection('accounts').doc('acc1').get();
        expect(finalSnap.data().balance).toBe(150);
    });

    test('update handles FieldValue.increment correctly', async () => {
        const mock = buildFirebaseMock({
            resources: {
                mic: { quantity: 10, availableQty: 8 }
            }
        });

        const ref = mock.db.collection('resources').doc('mic');
        await ref.update({
            availableQty: mock.admin.firestore.FieldValue.increment(-2)
        });

        const snap = await ref.get();
        expect(snap.data().availableQty).toBe(6);
    });

    test('exports borrowRequestsCollection and borrowOtpsCollection', () => {
        const mock = buildFirebaseMock();
        expect(mock.borrowRequestsCollection).toBeDefined();
        expect(mock.borrowOtpsCollection).toBeDefined();
    });
});
