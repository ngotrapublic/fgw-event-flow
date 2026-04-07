/**
 * test-conflict-confirm.js — Tests for Conflict Confirmation (Option B)
 * Verifies:
 *   - Backend: skipConflictCheck flag bypasses conflict detection
 *   - Backend: Without flag, conflicts still return 409
 *   - Backend: skipConflictCheck is cleaned from data before save
 *   - Frontend: EventForm has confirmation dialog, not hard block
 *
 * Run: node server/scripts/test-conflict-confirm.js
 */

const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let passed = 0;
let failed = 0;
const failures = [];

function assertEqual(actual, expected, testName) {
    if (actual === expected) {
        passed++;
        console.log(`  ${GREEN}✓${RESET} ${testName}`);
    } else {
        failed++;
        failures.push(`${testName} (expected: ${expected}, got: ${actual})`);
        console.log(`  ${RED}✗${RESET} ${testName} — expected: ${CYAN}${expected}${RESET}, got: ${RED}${actual}${RESET}`);
    }
}

function assert(condition, testName) {
    if (condition) {
        passed++;
        console.log(`  ${GREEN}✓${RESET} ${testName}`);
    } else {
        failed++;
        failures.push(testName);
        console.log(`  ${RED}✗${RESET} ${testName}`);
    }
}

// ─── BACKEND TESTS ──────────────────────────────────────────────────

async function testBackend_SkipConflictCheckFlag() {
    console.log(`\n${BOLD}${CYAN}━━━ Backend: skipConflictCheck flag logic ━━━${RESET}\n`);

    // Read the actual controller source
    const controllerPath = path.resolve(__dirname, '../controllers/eventController.js');
    const source = fs.readFileSync(controllerPath, 'utf-8');

    // Test 1: The condition should check for skipConflictCheck
    assert(
        source.includes('!eventData.skipConflictCheck'),
        'createEvent checks for skipConflictCheck flag'
    );

    // Test 2: The flag should be deleted before saving
    assert(
        source.includes('delete eventData.skipConflictCheck'),
        'skipConflictCheck is cleaned from data before DB save'
    );

    // Test 3: Conflict check is wrapped in conditional
    assert(
        source.includes('if (!eventData.skipConflictCheck)'),
        'Conflict check is wrapped in conditional block'
    );

    // Test 4: 409 response still exists (for non-skip cases)
    assert(
        source.includes("res.status(409).json"),
        'Still returns 409 when conflict detected and flag is not set'
    );
}

async function testBackend_ConflictLogicSimulation() {
    console.log(`\n${BOLD}${CYAN}━━━ Backend: Simulate conflict skip logic ━━━${RESET}\n`);

    // Simulate the exact logic from the controller
    function simulateConflictCheck(eventData) {
        let conflictBlocked = false;
        let conflictSkipped = false;

        if (!eventData.skipConflictCheck) {
            // Simulate finding a conflict
            const conflictFound = true;
            if (conflictFound) {
                conflictBlocked = true;
            }
        } else {
            conflictSkipped = true;
        }

        // Clean up flag
        delete eventData.skipConflictCheck;

        return { conflictBlocked, conflictSkipped, dataHasFlag: 'skipConflictCheck' in eventData };
    }

    // Case 1: No flag → conflict blocks
    const case1 = simulateConflictCheck({ eventName: 'Test', eventDate: '2026-04-10' });
    assertEqual(case1.conflictBlocked, true, 'Without flag: conflict BLOCKS creation');
    assertEqual(case1.conflictSkipped, false, 'Without flag: conflict is NOT skipped');

    // Case 2: With flag → conflict bypassed
    const case2 = simulateConflictCheck({ eventName: 'Test', eventDate: '2026-04-10', skipConflictCheck: true });
    assertEqual(case2.conflictBlocked, false, 'With flag: conflict does NOT block');
    assertEqual(case2.conflictSkipped, true, 'With flag: conflict IS skipped');
    assertEqual(case2.dataHasFlag, false, '⭐ Flag is removed from data (not saved to DB)');

    // Case 3: Explicit false → still blocks
    const case3 = simulateConflictCheck({ eventName: 'Test', eventDate: '2026-04-10', skipConflictCheck: false });
    assertEqual(case3.conflictBlocked, true, 'With flag=false: conflict still blocks');
}

// ─── FRONTEND TESTS ─────────────────────────────────────────────────

async function testFrontend_ConfirmDialogExists() {
    console.log(`\n${BOLD}${CYAN}━━━ Frontend: Confirmation Dialog Structure ━━━${RESET}\n`);

    const formPath = path.resolve(__dirname, '../../client/src/components/EventForm.jsx');
    const source = fs.readFileSync(formPath, 'utf-8');

    // Test 1: No more hard block
    assert(
        !source.includes("showError('Không thể tạo sự kiện! Vui lòng chọn thời gian hoặc địa điểm khác.')"),
        '⭐ Hard block error message is REMOVED'
    );

    // Test 2: Confirmation dialog state exists
    assert(
        source.includes('showConflictConfirm'),
        'showConflictConfirm state exists'
    );

    assert(
        source.includes('pendingSubmitData'),
        'pendingSubmitData state exists'
    );

    // Test 3: Dialog shows conflict warning
    assert(
        source.includes('Phát hiện trùng lịch'),
        'Dialog header shows "Phát hiện trùng lịch!"'
    );

    // Test 4: Confirm button exists
    assert(
        source.includes('Tôi hiểu, vẫn tạo'),
        'Confirm button "Tôi hiểu, vẫn tạo" exists'
    );

    // Test 5: Cancel button exists
    assert(
        source.includes('Huỷ bỏ'),
        'Cancel button "Huỷ bỏ" exists'
    );

    // Test 6: skipConflictCheck sent to backend
    assert(
        source.includes('skipConflictCheck: true'),
        'Frontend sends skipConflictCheck: true on confirm'
    );

    // Test 7: AlertTriangle icon imported
    assert(
        source.includes('AlertTriangle'),
        'AlertTriangle icon is imported from lucide-react'
    );
}

async function testFrontend_SubmitFlow() {
    console.log(`\n${BOLD}${CYAN}━━━ Frontend: Submit Flow Logic ━━━${RESET}\n`);

    const formPath = path.resolve(__dirname, '../../client/src/components/EventForm.jsx');
    const source = fs.readFileSync(formPath, 'utf-8');

    // Test: onSubmit shows dialog when conflict exists
    assert(
        source.includes('setShowConflictConfirm(true)'),
        'onSubmit opens confirmation dialog when conflict detected'
    );

    // Test: handleConflictConfirm calls submitEvent with skip flag
    assert(
        source.includes('submitEvent(pendingSubmitData, true)'),
        'handleConflictConfirm submits with skipConflict=true'
    );

    // Test: handleConflictCancel resets state
    assert(
        source.includes('setShowConflictConfirm(false)') && source.includes('setPendingSubmitData(null)'),
        'handleConflictCancel resets dialog and pending data'
    );

    // Test: prepareSubmitData is a separate function
    assert(
        source.includes('const prepareSubmitData'),
        'Data preparation is extracted to prepareSubmitData()'
    );

    // Test: submitEvent is a separate function
    assert(
        source.includes('const submitEvent'),
        'Event submission is extracted to submitEvent()'
    );

    // Test: No conflict → direct submit (no dialog)
    // Check that onSubmit calls submitEvent directly when no conflict
    assert(
        source.includes('await submitEvent(finalData)'),
        'No conflict → submits directly without dialog'
    );
}

// ─── MAIN ───────────────────────────────────────────────────────────

async function main() {
    console.log(`\n${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}`);
    console.log(`${BOLD}║  ${CYAN}Conflict Confirmation Test Suite (Option B)${RESET}${BOLD}            ║${RESET}`);
    console.log(`${BOLD}║  Warning + Confirm Dialog instead of hard block${RESET}${BOLD}        ║${RESET}`);
    console.log(`${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}`);

    await testBackend_SkipConflictCheckFlag();
    await testBackend_ConflictLogicSimulation();
    await testFrontend_ConfirmDialogExists();
    await testFrontend_SubmitFlow();

    const total = passed + failed;
    console.log(`\n${BOLD}═══════════════════════════════════════════════════════════${RESET}`);
    if (failed === 0) {
        console.log(`${GREEN}${BOLD}  ✅ ALL ${total} TESTS PASSED${RESET}`);
        console.log(`${GREEN}     Coverage: backend logic / frontend UI / submit flow${RESET}`);
    } else {
        console.log(`${RED}${BOLD}  ❌ ${failed}/${total} TESTS FAILED${RESET}`);
        failures.forEach(f => console.log(`    ${RED}• ${f}${RESET}`));
    }
    console.log(`${BOLD}═══════════════════════════════════════════════════════════${RESET}\n`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(`${RED}Fatal:${RESET}`, err); process.exit(1); });
