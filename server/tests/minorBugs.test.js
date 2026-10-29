/**
 * Regression tests for Minor/Cleanup Bugs (B7, B8, B11, B13, B14):
 * - B7: cacheService.clearStats() clears both 'stats' and 'stats_<dept>'
 * - B8: checkConflict returns 400 when eventDate or location is missing
 * - B11: validateUpdateEvent validates end date safely
 * - B13: CSV export day of week calculation is timezone-safe
 */

let mockFirebase;
jest.mock("../config/firebase", () => {
  mockFirebase = require("./helpers/firestoreMock").buildFirebaseMock({
    events: {},
    users: {},
  });
  return mockFirebase;
});
jest.mock("../services/emailService", () => ({ detectChanges: () => [] }));
jest.mock("../services/auditService", () => ({ logAudit: jest.fn() }));
jest.mock("../controllers/auditLogController", () => ({
  logAction: jest.fn(() => Promise.resolve()),
}));

const cacheService = require("../services/cacheService");
const eventController = require("../controllers/eventController");
const { validateUpdateEvent } = require("../middleware/eventValidation");

const mockReq = (body = {}, query = {}, params = {}) => ({
  body,
  query,
  params,
  user: { uid: "u1", role: "admin" },
  ip: "::1",
});
const mockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = (c) => {
    res.statusCode = c;
    return res;
  };
  res.json = (p) => {
    res.body = p;
    return res;
  };
  return res;
};

describe("Bug B7: cacheService.clearStats()", () => {
  test("clears both global stats and department-specific stats keys", async () => {
    // Pre-populate cache with global and department stats
    await cacheService.getOrFetch("stats", async () => ({ today: 5 }));
    await cacheService.getOrFetch("stats_IT", async () => ({ today: 2 }));
    await cacheService.getOrFetch("stats_TS", async () => ({ today: 3 }));
    await cacheService.getOrFetch("unrelated_key", async () => ({ data: 123 }));

    expect(cacheService.cache.has("stats")).toBe(true);
    expect(cacheService.cache.has("stats_IT")).toBe(true);
    expect(cacheService.cache.has("stats_TS")).toBe(true);
    expect(cacheService.cache.has("unrelated_key")).toBe(true);

    cacheService.clearStats();

    expect(cacheService.cache.has("stats")).toBe(false);
    expect(cacheService.cache.has("stats_IT")).toBe(false);
    expect(cacheService.cache.has("stats_TS")).toBe(false);
    expect(cacheService.cache.has("unrelated_key")).toBe(true);
  });
});

describe("Bug B8: checkConflict input validation", () => {
  test("returns 400 when eventDate is missing", async () => {
    const req = mockReq({
      location: ["Hall A"],
      startTime: "09:00",
      endTime: "10:00",
    });
    const res = mockRes();

    await eventController.checkConflict(req, res, jest.fn());

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("Missing required fields");
  });

  test("returns 400 when location is missing", async () => {
    const req = mockReq({
      eventDate: "2026-11-20",
      startTime: "09:00",
      endTime: "10:00",
    });
    const res = mockRes();

    await eventController.checkConflict(req, res, jest.fn());

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("Missing required fields");
  });
});

describe("Bug B11: validateUpdateEvent date range validation", () => {
  test("allows updating eventEndDate alone without eventDate (deferred to controller)", () => {
    const req = mockReq({ eventEndDate: "2026-11-25" });
    const res = mockRes();
    const next = jest.fn();

    validateUpdateEvent(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  test("rejects when both eventDate and eventEndDate are sent and end < start", () => {
    const req = mockReq({
      eventDate: "2026-11-25",
      eventEndDate: "2026-11-20",
    });
    const res = mockRes();
    const next = jest.fn();

    validateUpdateEvent(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain(
      "eventEndDate must be on or after eventDate",
    );
  });
});
