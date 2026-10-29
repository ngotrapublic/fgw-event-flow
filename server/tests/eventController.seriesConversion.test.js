/**
 * Bug 4 regression test: updateEvent must keep the series data consistent.
 * - Single event + eventEndDate -> converts to a series (sibling docs created)
 * - Series event + cleared eventEndDate -> converts back to single (siblings deleted)
 * - Bug B1: Editing a series from Day 2 without changing start date must not delete Day 1
 */

const SEED_EVENTS = {
  e1: {
    eventName: "Single Event",
    eventDate: "2026-11-10",
    startTime: "09:00",
    endTime: "10:00",
    location: "Hall A",
    department: "TS",
    isUniqueEvent: true,
    createdBy: "u1",
  },
  s1: {
    eventName: "Series Day1",
    eventDate: "2026-12-01",
    startTime: "09:00",
    endTime: "10:00",
    location: "Hall B",
    department: "TS",
    groupId: "g1",
    isSeriesStart: true,
    isUniqueEvent: true,
    seriesEndDate: "2026-12-03",
    createdBy: "u1",
  },
  s2: {
    eventName: "Series Day2",
    eventDate: "2026-12-02",
    startTime: "09:00",
    endTime: "10:00",
    location: "Hall B",
    department: "TS",
    groupId: "g1",
    isSeriesStart: false,
    isUniqueEvent: false,
    createdBy: "u1",
  },
  s3: {
    eventName: "Series Day3",
    eventDate: "2026-12-03",
    startTime: "09:00",
    endTime: "10:00",
    location: "Hall B",
    department: "TS",
    groupId: "g1",
    isSeriesStart: false,
    isUniqueEvent: false,
    createdBy: "u1",
  },
};

let mockFirebase;
jest.mock("../config/firebase", () => {
  mockFirebase = require("./helpers/firestoreMock").buildFirebaseMock({
    events: { ...SEED_EVENTS },
    users: {
      admin1: { email: "admin@fpt.edu.vn", role: "admin" },
    },
  });
  return mockFirebase;
});
jest.mock("../services/emailService", () => ({ detectChanges: () => [] }));
jest.mock("../services/auditService", () => ({ logAudit: jest.fn() }));
jest.mock("../controllers/auditLogController", () => ({
  logAction: jest.fn(() => Promise.resolve()),
}));

const eventController = require("../controllers/eventController");

const mockRes = () => {
  const res = {};
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

const req = (id, body, uid = "admin1") => ({
  params: { id },
  body,
  user: { uid },
  ip: "::1",
});

const store = () => mockFirebase.__stores.events;

// Re-seed the shared store before each test (tests mutate it)
beforeEach(() => {
  const s = store();
  s.clear();
  for (const [id, data] of Object.entries(SEED_EVENTS)) s.set(id, { ...data });
});

describe("updateEvent — single to series conversion", () => {
  test("creates sibling docs with shared groupId covering the new range", async () => {
    const res = mockRes();
    await eventController.updateEvent(
      req("e1", {
        eventDate: "2026-11-10",
        eventEndDate: "2026-11-12",
        eventName: "Single Event",
      }),
      res,
      jest.fn(),
    );

    const events = [...store().values()];
    const grouped = events.filter((e) => e.groupId && e.groupId !== "g1");
    expect(grouped.length).toBe(3);

    const dates = grouped.map((e) => e.eventDate).sort();
    expect(dates).toEqual(["2026-11-10", "2026-11-11", "2026-11-12"]);

    const gid = grouped[0].groupId;
    grouped.forEach((e) => expect(e.groupId).toBe(gid));

    const day1 = store().get("e1");
    expect(day1.isSeriesStart).toBe(true);
    expect(day1.isUniqueEvent).toBe(true);
    const siblings = grouped.filter((e) => e.eventDate !== "2026-11-10");
    siblings.forEach((e) => {
      expect(e.isUniqueEvent).toBe(false);
      expect(e.seriesEndDate).toBe("2026-11-12");
    });
  });
});

describe("updateEvent — series to single conversion (end date cleared)", () => {
  test("deletes sibling docs and clears series fields", async () => {
    const res = mockRes();
    await eventController.updateEvent(
      req("s1", {
        eventEndDate: "",
        eventName: "Back to single",
      }),
      res,
      jest.fn(),
    );

    const s1 = store().get("s1");
    expect(s1.groupId).toBeNull();
    expect(s1.isUniqueEvent).toBe(true);
    expect(s1.isSeriesStart).toBe(false);
    expect(s1.seriesEndDate).toBeNull();
    expect(s1.eventEndDate).toBeNull();
    expect(s1.eventName).toBe("Back to single");

    expect(store().has("s2")).toBe(false);
    expect(store().has("s3")).toBe(false);
  });
});

describe("updateEvent — existing series re-sync still works", () => {
  test("shrinking range deletes out-of-range docs only", async () => {
    const res = mockRes();
    // s1..s3 seeded group g1 (2026-12-01..03); shrink to 12-01..12-02
    await eventController.updateEvent(
      req("s1", {
        eventDate: "2026-12-01",
        eventEndDate: "2026-12-02",
        eventName: "Series Day1",
      }),
      res,
      jest.fn(),
    );

    expect(store().has("s3")).toBe(false);
    expect(store().has("s1")).toBe(true);
    expect(store().has("s2")).toBe(true);
    expect(store().get("s1").groupId).toBe("g1");
  });

  test("Bug B1 regression: editing from Day 2 does not delete Day 1", async () => {
    const res = mockRes();
    // s1..s3 is seeded as group g1 (2026-12-01 to 2026-12-03).
    // User opens and edits s2 (Day 2: 2026-12-02).
    // Form submits with eventDate='2026-12-02' (doc s2's eventDate) and eventEndDate='2026-12-03'.
    await eventController.updateEvent(
      req("s2", {
        eventDate: "2026-12-02",
        eventEndDate: "2026-12-03",
        eventName: "Renamed From Day 2",
      }),
      res,
      jest.fn(),
    );

    // Day 1 (s1) MUST NOT be deleted!
    expect(store().has("s1")).toBe(true);
    expect(store().has("s2")).toBe(true);
    expect(store().has("s3")).toBe(true);
    expect(store().get("s1").eventName).toBe("Renamed From Day 2");
    expect(store().get("s1").isSeriesStart).toBe(true);
  });
});
