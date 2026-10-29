/**
 * Event Validation Middleware Tests
 * Covers Bug B2: rejecting identical startTime and endTime.
 */

const {
  validateCreateEvent,
  validateUpdateEvent,
} = require("../middleware/eventValidation");

const mockReq = (body) => ({ body });
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

describe("eventValidation middleware (Bug B2 validation)", () => {
  describe("validateCreateEvent", () => {
    const validBase = {
      eventName: "Tech Workshop",
      eventDate: "2026-11-20",
      startTime: "09:00",
      endTime: "11:00",
      location: ["Hall A"],
      department: "TS",
      registrantEmail: "test@fpt.edu.vn",
    };

    test("passes with valid start and end times", () => {
      const req = mockReq({ ...validBase });
      const res = mockRes();
      const next = jest.fn();

      validateCreateEvent(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    test("rejects when startTime and endTime are identical", () => {
      const req = mockReq({
        ...validBase,
        startTime: "10:00",
        endTime: "10:00",
      });
      const res = mockRes();
      const next = jest.fn();

      validateCreateEvent(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain(
        "startTime and endTime cannot be identical",
      );
    });
  });

  describe("validateUpdateEvent", () => {
    test("passes when valid times are provided", () => {
      const req = mockReq({ startTime: "09:00", endTime: "11:00" });
      const res = mockRes();
      const next = jest.fn();

      validateUpdateEvent(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    test("rejects when updated startTime and endTime are identical", () => {
      const req = mockReq({ startTime: "14:30", endTime: "14:30" });
      const res = mockRes();
      const next = jest.fn();

      validateUpdateEvent(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain(
        "startTime and endTime cannot be identical",
      );
    });

    test("passes when only startTime or endTime is updated individually", () => {
      const req = mockReq({ startTime: "14:30" });
      const res = mockRes();
      const next = jest.fn();

      validateUpdateEvent(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });
  });
});
