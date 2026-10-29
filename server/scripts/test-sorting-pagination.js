// Comprehensive filter test — run from server/ directory
process.env.NODE_ENV = "production";
const eventController = require("../controllers/eventController");

function mockRes() {
  return {
    statusCode: 200,
    finalData: null,
    json(d) {
      this.finalData = d;
      return this;
    },
    status(c) {
      this.statusCode = c;
      return this;
    },
  };
}
const next = (err) => {
  if (err) console.error("ERR:", err);
};

let passed = 0,
  failed = 0;
function assert(label, condition) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

async function run() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("🔎 KIỂM TRA TOÀN DIỆN BỘ LỌC (Filter Comprehensive Test)");
  console.log("══════════════════════════════════════════════════════════════");
  const todayStr = new Date(Date.now() + 7 * 3600 * 1000)
    .toISOString()
    .split("T")[0];
  console.log(`📅 Hôm nay (UTC+7): ${todayStr}\n`);

  // ═══════════════════════════════════════════════════════════
  // TEST 1: Mặc định "Sắp diễn ra" (upcoming)
  // ═══════════════════════════════════════════════════════════
  console.log("[TEST 1] dateFilter=upcoming (Mặc định khi mở Dashboard)");
  const r1 = mockRes();
  await eventController.getAllEvents(
    { query: { dateFilter: "upcoming", limit: "9" } },
    r1,
    next,
  );
  const d1 = r1.finalData;
  assert("Trả về events array", Array.isArray(d1?.events));
  assert("Có dữ liệu", d1.events.length > 0);
  assert(
    "Tất cả sự kiện >= hôm nay",
    d1.events.every((e) => e.eventDate >= todayStr),
  );
  let asc1 = true;
  for (let i = 0; i < d1.events.length - 1; i++) {
    if (d1.events[i].eventDate > d1.events[i + 1].eventDate) {
      asc1 = false;
      break;
    }
  }
  assert("Sắp xếp TĂNG DẦN (ASC)", asc1);
  // Secondary sort check
  let timeOk1 = true;
  for (let i = 0; i < d1.events.length - 1; i++) {
    if (d1.events[i].eventDate === d1.events[i + 1].eventDate) {
      if (
        (d1.events[i].startTime || "00:00") >
        (d1.events[i + 1].startTime || "00:00")
      ) {
        timeOk1 = false;
      }
    }
  }
  assert("Cùng ngày → giờ bắt đầu tăng dần (Sáng→Chiều→Tối)", timeOk1);
  assert(`Total (${d1.meta.total}) > 0`, d1.meta.total > 0);
  d1.events
    .slice(0, 3)
    .forEach((e, i) =>
      console.log(
        `    ${i + 1}. [${e.eventDate}] (${e.startTime}) ${e.eventName}`,
      ),
    );

  // ═══════════════════════════════════════════════════════════
  // TEST 2: "Tất cả" (all) — từ frontend gửi filterDate='all' → backend không nhận dateFilter
  // ═══════════════════════════════════════════════════════════
  console.log("\n[TEST 2] dateFilter=all (Tất cả sự kiện)");
  const r2 = mockRes();
  // Frontend sends NO dateFilter when filterDate='all' (see line 666)
  await eventController.getAllEvents({ query: { limit: "9" } }, r2, next);
  const d2 = r2.finalData;
  assert("Trả về events array", Array.isArray(d2?.events));
  assert("Có dữ liệu", d2.events.length > 0);
  let desc2 = true;
  for (let i = 0; i < d2.events.length - 1; i++) {
    if (d2.events[i].eventDate < d2.events[i + 1].eventDate) {
      desc2 = false;
      break;
    }
  }
  assert("Sắp xếp GIẢM DẦN (DESC) — mới nhất ở trên", desc2);
  assert(
    `Total (${d2.meta.total}) là tổng toàn bộ sự kiện`,
    d2.meta.total > d1.meta.total,
  );
  d2.events
    .slice(0, 3)
    .forEach((e, i) =>
      console.log(
        `    ${i + 1}. [${e.eventDate}] (${e.startTime}) ${e.eventName}`,
      ),
    );

  // ═══════════════════════════════════════════════════════════
  // TEST 3: "Đã kết thúc" (past)
  // ═══════════════════════════════════════════════════════════
  console.log("\n[TEST 3] dateFilter=past (Đã kết thúc)");
  const r3 = mockRes();
  await eventController.getAllEvents(
    { query: { dateFilter: "past", limit: "9" } },
    r3,
    next,
  );
  const d3 = r3.finalData;
  assert("Trả về events array", Array.isArray(d3?.events));
  assert("Có dữ liệu", d3.events.length > 0);
  assert(
    "Tất cả sự kiện < hôm nay",
    d3.events.every((e) => e.eventDate < todayStr),
  );
  let desc3 = true;
  for (let i = 0; i < d3.events.length - 1; i++) {
    if (d3.events[i].eventDate < d3.events[i + 1].eventDate) {
      desc3 = false;
      break;
    }
  }
  assert("Sắp xếp GIẢM DẦN (DESC) — mới diễn ra gần nhất ở trên", desc3);
  d3.events
    .slice(0, 3)
    .forEach((e, i) =>
      console.log(`    ${i + 1}. [${e.eventDate}] ${e.eventName}`),
    );

  // ═══════════════════════════════════════════════════════════
  // TEST 4: "Hôm nay" (today)
  // ═══════════════════════════════════════════════════════════
  console.log("\n[TEST 4] dateFilter=today (Hôm nay)");
  const r4 = mockRes();
  await eventController.getAllEvents(
    { query: { dateFilter: "today", limit: "9" } },
    r4,
    next,
  );
  const d4 = r4.finalData;
  assert("Trả về events array", Array.isArray(d4?.events));
  assert(
    `Tất cả sự kiện đúng ngày hôm nay (${todayStr})`,
    d4.events.every((e) => e.eventDate === todayStr),
  );
  console.log(`    Số sự kiện hôm nay: ${d4.events.length}`);

  // ═══════════════════════════════════════════════════════════
  // TEST 5: Bộ lọc Bộ phận (department)
  // ═══════════════════════════════════════════════════════════
  console.log("\n[TEST 5] department='Phòng Đào Tạo' + dateFilter=upcoming");
  const r5 = mockRes();
  await eventController.getAllEvents(
    {
      query: {
        dateFilter: "upcoming",
        department: "Phòng Đào Tạo",
        limit: "9",
      },
    },
    r5,
    next,
  );
  const d5 = r5.finalData;
  assert("Trả về events array", Array.isArray(d5?.events));
  assert(
    "Tất cả sự kiện thuộc 'Phòng Đào Tạo'",
    d5.events.every((e) => e.department === "Phòng Đào Tạo"),
  );
  assert(
    "Tất cả sự kiện >= hôm nay",
    d5.events.every((e) => e.eventDate >= todayStr),
  );
  assert(
    `Total (${d5.meta.total}) <= total upcoming (${d1.meta.total})`,
    d5.meta.total <= d1.meta.total,
  );
  console.log(`    Số sự kiện: ${d5.events.length}`);

  // ═══════════════════════════════════════════════════════════
  // TEST 6: Phân trang (Pagination) — upcoming asc
  // ═══════════════════════════════════════════════════════════
  console.log("\n[TEST 6] Pagination: upcoming, page 1 → page 2 (limit=4)");
  const rp1 = mockRes();
  await eventController.getAllEvents(
    { query: { dateFilter: "upcoming", limit: "4" } },
    rp1,
    next,
  );
  const p1 = rp1.finalData;
  assert("Page 1 có 4 sự kiện", p1.events.length === 4);
  assert("hasMore = true", p1.meta.hasMore === true);

  const rp2 = mockRes();
  await eventController.getAllEvents(
    {
      query: { dateFilter: "upcoming", limit: "4", lastDocId: p1.meta.lastId },
    },
    rp2,
    next,
  );
  const p2 = rp2.finalData;
  assert("Page 2 có sự kiện", p2.events.length > 0);
  const p1Ids = new Set(p1.events.map((e) => e.id));
  assert(
    "Không trùng ID giữa Page 1 & Page 2",
    p2.events.every((e) => !p1Ids.has(e.id)),
  );
  // Verify date continuity: last date of P1 <= first date of P2
  const p1Last = p1.events[p1.events.length - 1].eventDate;
  const p2First = p2.events[0].eventDate;
  assert(
    `Ngày liên tục: P1 cuối (${p1Last}) <= P2 đầu (${p2First})`,
    p1Last <= p2First,
  );

  // ═══════════════════════════════════════════════════════════
  // TEST 7: Phân trang (Pagination) — all desc
  // ═══════════════════════════════════════════════════════════
  console.log("\n[TEST 7] Pagination: all (desc), page 1 → page 2 (limit=4)");
  const ra1 = mockRes();
  await eventController.getAllEvents({ query: { limit: "4" } }, ra1, next);
  const a1 = ra1.finalData;
  assert("Page 1 có 4 sự kiện", a1.events.length === 4);

  const ra2 = mockRes();
  await eventController.getAllEvents(
    { query: { limit: "4", lastDocId: a1.meta.lastId } },
    ra2,
    next,
  );
  const a2 = ra2.finalData;
  assert("Page 2 có sự kiện", a2.events.length > 0);
  const a1Last = a1.events[a1.events.length - 1].eventDate;
  const a2First = a2.events[0].eventDate;
  assert(
    `Ngày giảm dần liên tục: P1 cuối (${a1Last}) >= P2 đầu (${a2First})`,
    a1Last >= a2First,
  );

  // ═══════════════════════════════════════════════════════════
  // TEST 8: Chuyển đổi filter nhanh: upcoming → all → past → upcoming
  // (Mô phỏng user bấm bộ lọc liên tục trên Dashboard)
  // ═══════════════════════════════════════════════════════════
  console.log(
    "\n[TEST 8] Chuyển đổi filter nhanh (mô phỏng user bấm liên tục)",
  );
  const filters = ["upcoming", null, "past", "upcoming", "today", null];
  const labels = ["upcoming", "all", "past", "upcoming", "today", "all"];
  for (let i = 0; i < filters.length; i++) {
    const q = { limit: "3" };
    if (filters[i]) q.dateFilter = filters[i];
    const r = mockRes();
    await eventController.getAllEvents({ query: q }, r, next);
    assert(
      `Switch → ${labels[i]}: statusCode=${r.statusCode}, events=${r.finalData?.events?.length}`,
      r.statusCode === 200 && Array.isArray(r.finalData?.events),
    );
  }

  // ═══════════════════════════════════════════════════════════
  // TEST 9: Edge case — dateFilter=upcoming nhưng không có bộ lọc khác
  // Kiểm tra total count dùng aggregation query (hasFilters=true)
  // ═══════════════════════════════════════════════════════════
  console.log("\n[TEST 9] Total count accuracy với aggregation query");
  const r9 = mockRes();
  await eventController.getAllEvents(
    { query: { dateFilter: "upcoming", limit: "1" } },
    r9,
    next,
  );
  const total9 = r9.finalData.meta.total;
  // Fetch all upcoming to verify
  const r9b = mockRes();
  await eventController.getAllEvents(
    { query: { dateFilter: "upcoming", limit: "100" } },
    r9b,
    next,
  );
  const actual9 = r9b.finalData.events.length;
  assert(
    `Total từ aggregation (${total9}) = tổng thực tế (${actual9})`,
    total9 === actual9,
  );

  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════
  console.log(
    "\n══════════════════════════════════════════════════════════════",
  );
  console.log(
    `📊 KẾT QUẢ: ${passed} PASSED / ${failed} FAILED / ${passed + failed} TOTAL`,
  );
  if (failed === 0) {
    console.log("🎉 TẤT CẢ ĐỀU PASS — BỘ LỌC HOẠT ĐỘNG HOÀN HẢO!");
  } else {
    console.log("⚠️ CÓ LỖI CẦN XỬ LÝ!");
  }
  console.log("══════════════════════════════════════════════════════════════");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
