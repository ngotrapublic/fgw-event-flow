/**
 * Bug 5 regression test (static): firestore.rules must not contain
 * a permissive catch-all that nullifies role-based write rules.
 * (Full semantics need the Firestore emulator — this guards against
 * reintroducing the vulnerable pattern.)
 */

const fs = require('fs');
const path = require('path');

const rulesPath = path.resolve(__dirname, '../../firestore.rules');
const rules = fs.readFileSync(rulesPath, 'utf8');

describe('firestore.rules — security posture', () => {
    test('no permissive read+write catch-all remains', () => {
        expect(rules).not.toMatch(/allow\s+read\s*,\s*write\s*:/);
    });

    test('catch-all is read-only (explicit write deny)', () => {
        const catchAll = rules.match(/match\s*\/?\{document=\*\*\}\s*\{([\s\S]*?)\}\s*\n?\s*\}/);
        expect(catchAll).not.toBeNull();
        expect(catchAll[1]).toMatch(/allow\s+read\s*:/);
        expect(catchAll[1]).toMatch(/allow\s+write\s*:\s*if\s*false/);
    });

    test('events write still requires admin or manager', () => {
        const events = rules.match(/match\s*\/events\/\{eventId\}\s*\{([\s\S]*?)\}/);
        expect(events[1]).toMatch(/hasRole\('admin'\)\s*\|\|\s*hasRole\('manager'\)/);
    });

    test('users cannot change their own role via client', () => {
        const users = rules.match(/match\s*\/users\/\{userId\}\s*\{([\s\S]*?)\}/);
        // client has no write path to user docs at all
        expect(users[1]).toMatch(/allow\s+write\s*:\s*if\s*false/);
        expect(users[1]).not.toMatch(/allow\s+(update|create)\s*:\s*if\s+request/);
    });

    test('notifications restricted to owner (client writes these directly)', () => {
        const notifs = rules.match(/match\s*\/notifications\/\{notifId\}\s*\{([\s\S]*?)\}/);
        expect(notifs).not.toBeNull();
        expect(notifs[1]).toMatch(/resource\.data\.userId\s*==\s*request\.auth\.uid/);
        // owner may only flip isRead — cannot reassign userId or rewrite content
        expect(notifs[1]).toMatch(/affectedKeys\(\)\.hasOnly\(\['isRead'\]\)/);
    });
});
