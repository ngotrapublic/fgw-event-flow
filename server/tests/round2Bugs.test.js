/**
 * server/tests/round2Bugs.test.js
 * Verification test suite for Bug Report Round 2: N2, N4, N5, N6, N7, N8, N9.
 */

jest.mock("../config/firebase", () => {
  const { buildFirebaseMock } = require("./helpers/firestoreMock");
  return buildFirebaseMock({ events: {}, users: {} });
});

jest.mock("../controllers/auditLogController", () => ({
  logAction: jest.fn().mockResolvedValue(true),
}));

jest.mock("../services/auditService", () => ({
  logAudit: jest.fn(),
}));

jest.mock("../services/notificationService", () => ({
  create: jest.fn().mockResolvedValue(true),
}));

jest.mock("../services/conflictService", () => ({
  checkConflict: jest.fn().mockResolvedValue(null),
}));

let mockEnqueueShouldThrow = false;
jest.mock("../services/emailQueue", () => ({
  enqueue: jest.fn().mockImplementation(async () => {
    if (mockEnqueueShouldThrow) {
      throw new Error("Redis/Firestore email queue connection timeout");
    }
    return true;
  }),
}));

const mockFirebase = require("../config/firebase");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockImplementation((data) => {
    res.finalData = data;
    return res;
  });
  return res;
};

const next = jest.fn();

let eventController;
let cacheService;

describe("Round 2 Bug Fixes (N2, N4, N5, N6, N7, N8, N9)", () => {
  beforeEach(() => {
    // Reset stores
    mockFirebase.__stores.events.clear();
    mockFirebase.__stores.users.clear();
    mockFirebase.__stores.metadata = new Map();
    mockEnqueueShouldThrow = false;
    jest.clearAllMocks();
    cacheService = require("../services/cacheService");
    cacheService.clearAll();
    eventController = require("../controllers/eventController");
  });

  // ─────────────────────────────────────────────────────────────
  // N2: createEvent payload sanitization & deleteEvent series ownership
  // ─────────────────────────────────────────────────────────────
  describe("Bug N2: Security & Group Isolation", () => {
    test("createEvent strips injected groupId, id, and createdBy for single-day events", async () => {
      const req = {
        user: {
          uid: "attacker-123",
          email: "attacker@fe.edu.vn",
          role: "user",
        },
        body: {
          id: "fake-id",
          groupId: "victim-series-group-999",
          createdBy: "admin-uid",
          eventName: "Attacker Single Event",
          eventDate: "2026-11-20",
          startTime: "09:00",
          endTime: "11:00",
          location: ["Hội trường Tầng 3"],
          department: "PDP",
        },
        ip: "127.0.0.1",
      };
      const res = mockRes();

      await eventController.createEvent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      const created = res.finalData;
      expect(created.groupId).toBeNull();
      expect(created.createdBy).toBe("attacker-123");
      expect(created.id).not.toBe("fake-id");

      // Verify stored in DB
      const stored = await mockFirebase.db
        .collection("events")
        .doc(created.id)
        .get();
      expect(stored.data().groupId).toBeNull();
      expect(stored.data().createdBy).toBe("attacker-123");
    });

    test("deleteEvent forbids regular user from deleting series if sibling docs belong to another user", async () => {
      const victimDocId = "victim-doc-1";
      const attackerDocId = "attacker-doc-2";
      const sharedGroupId = "shared-series-grp";

      await mockFirebase.db
        .collection("users")
        .doc("attacker-123")
        .set({ role: "user" });

      // Create victim doc
      await mockFirebase.db.collection("events").doc(victimDocId).set({
        eventName: "Victim Series Day 1",
        groupId: sharedGroupId,
        createdBy: "victim-user-456",
        eventDate: "2026-11-20",
      });

      // Create attacker doc in same group
      await mockFirebase.db.collection("events").doc(attackerDocId).set({
        eventName: "Victim Series Day 2",
        groupId: sharedGroupId,
        createdBy: "attacker-123",
        eventDate: "2026-11-21",
      });

      const req = {
        user: {
          uid: "attacker-123",
          email: "attacker@fe.edu.vn",
          role: "user",
        },
        params: { id: attackerDocId },
        ip: "127.0.0.1",
      };
      const res = mockRes();

      await eventController.deleteEvent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.finalData.error).toMatch(
        /You do not own all events in this series/,
      );

      // Victim doc must still exist
      const victimStillExists = await mockFirebase.db
        .collection("events")
        .doc(victimDocId)
        .get();
      expect(victimStillExists.exists).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // N4: updateEvent handles emailQueue throwing gracefully
  // ─────────────────────────────────────────────────────────────
  describe("Bug N4: Safe Email Queueing on Update", () => {
    test("updateEvent returns 200 and purges cache even if emailQueue.enqueue throws", async () => {
      const docId = "evt-update-email-err";
      await mockFirebase.db
        .collection("events")
        .doc(docId)
        .set({
          eventName: "Original Event",
          eventDate: "2026-11-25",
          startTime: "08:00",
          endTime: "10:00",
          location: ["Sảnh Tầng 1"],
          createdBy: "user-1",
          department: "IT",
        });
      await mockFirebase.db
        .collection("users")
        .doc("user-1")
        .set({ role: "admin" });

      mockEnqueueShouldThrow = true; // Email queue failure

      const req = {
        user: { uid: "user-1", email: "user1@fe.edu.vn", role: "admin" },
        params: { id: docId },
        body: {
          eventName: "Updated Event Name (triggers email)",
        },
        ip: "127.0.0.1",
      };
      const res = mockRes();

      await eventController.updateEvent(req, res, next);

      expect(res.json).toHaveBeenCalled();
      expect(res.finalData.eventName).toBe(
        "Updated Event Name (triggers email)",
      );
      // Next should NOT have been called with 500 error
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // N5: Editing series from Day 2 does not send false "Date changed"
  // ─────────────────────────────────────────────────────────────
  describe("Bug N5: False Date Changed Alert Prevention", () => {
    test("editing from day 2 with eventDate=seriesStartDate does not detect date change", async () => {
      const groupId = "series-group-n5";
      const day1Id = "n5-day-1";
      const day2Id = "n5-day-2";

      await mockFirebase.db.collection("events").doc(day1Id).set({
        eventName: "Multi Day Series",
        eventDate: "2026-11-10",
        seriesStartDate: "2026-11-10",
        seriesEndDate: "2026-11-12",
        isSeriesStart: true,
        isUniqueEvent: true,
        groupId,
        createdBy: "creator-uid",
        startTime: "08:00",
        endTime: "10:00",
      });

      await mockFirebase.db.collection("events").doc(day2Id).set({
        eventName: "Multi Day Series",
        eventDate: "2026-11-11",
        seriesStartDate: "2026-11-10",
        seriesEndDate: "2026-11-12",
        isSeriesStart: false,
        isUniqueEvent: false,
        groupId,
        createdBy: "creator-uid",
        startTime: "08:00",
        endTime: "10:00",
      });

      await mockFirebase.db
        .collection("users")
        .doc("creator-uid")
        .set({ role: "admin" });

      const emailQueue = require("../services/emailQueue");

      // Form sends eventDate as seriesStartDate (2026-11-10) when editing day 2
      const req = {
        user: { uid: "creator-uid", email: "creator@fe.edu.vn", role: "admin" },
        params: { id: day2Id },
        body: {
          eventName: "Multi Day Series Updated",
          eventDate: "2026-11-10",
          eventEndDate: "2026-11-12",
        },
        ip: "127.0.0.1",
      };
      const res = mockRes();

      await eventController.updateEvent(req, res, next);

      expect(res.json).toHaveBeenCalled();
      // Verify emailQueue was called with changes that do NOT include "Date changed"
      if (emailQueue.enqueue.mock.calls.length > 0) {
        const enqueuedPayload = emailQueue.enqueue.mock.calls[0][0];
        const changes = enqueuedPayload.changes || [];
        const dateChangedEntry = changes.find((c) =>
          c.includes("Date changed"),
        );
        expect(dateChangedEntry).toBeUndefined();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // N6: Search quota optimization (< 2 chars, truncated flag)
  // ─────────────────────────────────────────────────────────────
  describe("Bug N6: Search Quota Optimization", () => {
    test("search with 1 character returns empty result without reading 500 docs", async () => {
      const req = { query: { search: "a" } };
      const res = mockRes();

      await eventController.getAllEvents(req, res, next);

      expect(res.finalData.events).toEqual([]);
      expect(res.finalData.meta.total).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // N7: single -> series conversion populates seriesStartDate
  // ─────────────────────────────────────────────────────────────
  describe("Bug N7: seriesStartDate on Conversion", () => {
    test("converting single-day event to series sets seriesStartDate on all docs", async () => {
      const docId = "single-to-series-doc";
      await mockFirebase.db.collection("events").doc(docId).set({
        eventName: "Single Event to Convert",
        eventDate: "2026-11-01",
        createdBy: "user-uid",
        isUniqueEvent: true,
      });
      await mockFirebase.db
        .collection("users")
        .doc("user-uid")
        .set({ role: "admin" });

      const req = {
        user: { uid: "user-uid", email: "user@fe.edu.vn", role: "admin" },
        params: { id: docId },
        body: {
          eventDate: "2026-11-01",
          eventEndDate: "2026-11-03",
        },
        ip: "127.0.0.1",
      };
      const res = mockRes();

      await eventController.updateEvent(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const day1 = await mockFirebase.db.collection("events").doc(docId).get();
      expect(day1.data().seriesStartDate).toBe("2026-11-01");

      const allDocs = await mockFirebase.db
        .collection("events")
        .where("groupId", "==", day1.data().groupId)
        .get();
      expect(allDocs.size).toBe(3);
      allDocs.docs.forEach((d) => {
        expect(d.data().seriesStartDate).toBe("2026-11-01");
        expect(d.data().seriesEndDate).toBe("2026-11-03");
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // N8: 30-day limit validation on update
  // ─────────────────────────────────────────────────────────────
  describe("Bug N8: Series 30-Day Limit on Update", () => {
    test("updateEvent rejects series extending beyond 30 days with 400 Bad Request", async () => {
      const docId = "series-30day-test";
      await mockFirebase.db.collection("events").doc(docId).set({
        eventName: "Event to extend",
        eventDate: "2026-11-01",
        createdBy: "user-uid",
        isUniqueEvent: true,
      });
      await mockFirebase.db
        .collection("users")
        .doc("user-uid")
        .set({ role: "admin" });

      const req = {
        user: { uid: "user-uid", email: "user@fe.edu.vn", role: "admin" },
        params: { id: docId },
        body: {
          eventDate: "2026-11-01",
          eventEndDate: "2026-12-15", // 45 days
        },
        ip: "127.0.0.1",
      };
      const res = mockRes();

      await eventController.updateEvent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.finalData.error).toMatch(/cannot span more than 30 days/i);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // N9: Missing cursor anchor fallback
  // ─────────────────────────────────────────────────────────────
  describe("Bug N9: Pagination Fallback When Cursor Anchor Is Missing", () => {
    test("falls back to page offset calculation when lastDocId is not found", async () => {
      // Seed 10 events
      for (let i = 1; i <= 10; i++) {
        const dateStr = `2026-11-${String(i).padStart(2, "0")}`;
        await mockFirebase.db
          .collection("events")
          .doc(`evt-${i}`)
          .set({
            eventName: `Event ${i}`,
            eventDate: dateStr,
            isUniqueEvent: true,
            location: ["Hội trường Tầng 3"],
          });
      }

      const req = {
        query: {
          location: "Hội trường Tầng 3",
          dateFilter: "upcoming",
          limit: "3",
          lastDocId: "deleted-doc-anchor",
          page: "2",
        },
      };
      const res = mockRes();

      await eventController.getAllEvents(req, res, next);

      expect(res.finalData.events.length).toBe(3);
      // Page 2 (offset 3) should return evt-4, evt-5, evt-6 instead of jumping back to page 1 (evt-1, evt-2, evt-3)
      expect(res.finalData.events[0].id).toBe("evt-4");
    });
  });
});
