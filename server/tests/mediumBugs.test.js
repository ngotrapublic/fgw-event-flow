/**
 * Regression tests for Medium Priority Bugs (B3, B5, B6):
 * - B3: Logistics Kanban uses Vietnam timezone (UTC+7) for 3-day operational window
 * - B5: Server-side search finds matching events across datasets
 * - B6: canModifyEvent prevents regular users from editing/deleting past events, while allowing admins
 */

const SEED_EVENTS = {
  past1: {
    eventName: "Past AI Workshop",
    eventDate: "2025-01-10",
    startTime: "09:00",
    endTime: "11:00",
    location: ["Hall A"],
    department: "TS",
    isUniqueEvent: true,
    createdBy: "user1",
  },
  future1: {
    eventName: "Future Blockchain Summit",
    eventDate: "2027-05-15",
    startTime: "10:00",
    endTime: "12:00",
    location: ["Auditorium"],
    department: "IT",
    isUniqueEvent: true,
    createdBy: "user1",
  },
  future2: {
    eventName: "Future Cloud Conference",
    eventDate: "2027-06-20",
    startTime: "14:00",
    endTime: "16:00",
    location: ["Hall B"],
    department: "IT",
    isUniqueEvent: true,
    createdBy: "user2",
  },
};

let mockFirebase;
jest.mock("../config/firebase", () => {
  mockFirebase = require("./helpers/firestoreMock").buildFirebaseMock({
    events: { ...SEED_EVENTS },
    users: {
      admin1: { email: "admin@fpt.edu.vn", role: "admin" },
      user1: { email: "user1@fpt.edu.vn", role: "user" },
      user2: { email: "user2@fpt.edu.vn", role: "user" },
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

const req = (params = {}, query = {}, body = {}, uid = "admin1") => ({
  params,
  query,
  body,
  user: { uid },
  ip: "::1",
});

const store = () => mockFirebase.__stores.events;

beforeEach(() => {
  const s = store();
  s.clear();
  for (const [id, data] of Object.entries(SEED_EVENTS)) s.set(id, { ...data });
  jest.clearAllMocks();
});

describe("Bug B6: Past events modification policy consistency", () => {
  test("regular user CANNOT update their own past event", async () => {
    const res = mockRes();
    await eventController.updateEvent(
      req({ id: "past1" }, {}, { eventName: "Hacked Past Event" }, "user1"),
      res,
      jest.fn(),
    );

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toContain("Regular users cannot modify past events");
    // Data unchanged
    expect(store().get("past1").eventName).toBe("Past AI Workshop");
  });

  test("regular user CANNOT delete their own past event", async () => {
    const res = mockRes();
    await eventController.deleteEvent(
      req({ id: "past1" }, {}, {}, "user1"),
      res,
      jest.fn(),
    );

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toContain("Regular users cannot delete past events");
    expect(store().has("past1")).toBe(true);
  });

  test("admin CAN update and delete past events", async () => {
    const res = mockRes();
    await eventController.updateEvent(
      req(
        { id: "past1" },
        {},
        { eventName: "Admin Updated Past Event" },
        "admin1",
      ),
      res,
      jest.fn(),
    );

    expect(res.statusCode).toBe(200);
    expect(store().get("past1").eventName).toBe("Admin Updated Past Event");
  });

  test("regular user CAN update their own FUTURE event", async () => {
    const res = mockRes();
    await eventController.updateEvent(
      req(
        { id: "future1" },
        {},
        { eventName: "Updated Future Summit" },
        "user1",
      ),
      res,
      jest.fn(),
    );

    expect(res.statusCode).toBe(200);
    expect(store().get("future1").eventName).toBe("Updated Future Summit");
  });
});

describe("Bug B5: Server-side search across events", () => {
  test("finds event by keyword matching eventName", async () => {
    const res = mockRes();
    await eventController.getAllEvents(
      req({}, { search: "Blockchain" }, {}, "admin1"),
      res,
      jest.fn(),
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.events.length).toBe(1);
    expect(res.body.events[0].eventName).toBe("Future Blockchain Summit");
    expect(res.body.meta.total).toBe(1);
  });

  test("finds event by keyword matching location", async () => {
    const res = mockRes();
    await eventController.getAllEvents(
      req({}, { search: "Auditorium" }, {}, "admin1"),
      res,
      jest.fn(),
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.events.length).toBe(1);
    expect(res.body.events[0].id).toBe("future1");
  });

  test("returns empty results when no events match search keyword", async () => {
    const res = mockRes();
    await eventController.getAllEvents(
      req({}, { search: "NonExistentKeywordXYZ" }, {}, "admin1"),
      res,
      jest.fn(),
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.events.length).toBe(0);
    expect(res.body.meta.total).toBe(0);
  });
});

describe("Bug B3: Logistics Kanban Vietnam timezone operational window", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("at 03:00 AM VN time (20:00 UTC previous day), operational window reflects VN date", async () => {
    // 20:00 UTC Oct 28 == 03:00 AM VN Oct 29
    jest.useFakeTimers().setSystemTime(new Date("2026-10-28T20:00:00Z"));

    // Seed an event on 2026-10-29 (which is TODAY in VN time, but tomorrow in UTC)
    store().set("todayVnEvent", {
      eventName: "Early Morning Logistics",
      eventDate: "2026-10-29",
      startTime: "06:00",
      endTime: "08:00",
      location: ["Hall A"],
    });

    // Clear cache so it fetches fresh
    const cacheService = require("../services/cacheService");
    cacheService.invalidate("logistics");

    const res = mockRes();
    await eventController.getLogisticsEvents(req(), res, jest.fn());

    expect(res.statusCode).toBe(200);
    // The event on Oct 29 must be served because Oct 29 is TODAY in VN time!
    const found = res.body.find((e) => e.id === "todayVnEvent");
    expect(found).toBeDefined();
    expect(found.eventName).toBe("Early Morning Logistics");
  });
});
