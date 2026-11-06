/**
 * Kịch bản kiểm thử hồi quy cho BUG-01, BUG-02, BUG-03
 * Chạy lại bất kỳ lúc nào bằng lệnh:
 *   cd backend và chạy npm run test:qa
 *
 * Nguyên tắc an toàn:
 * - Chỉ tạo và xóa tài khoản thử có tiền tố codex-retest-<run>-<timestamp>@example.com.
 * - Không in mật khẩu, JWT_SECRET, DATABASE_URL hoặc token ra console/log.
 * - Kiểm tra đầy đủ cả chiều BỊ CHẶN (400 + không làm đổi dữ liệu/km trong DB) và chiều ĐƯỢC PHÉP (200).
 */
const fs = require("fs");
const path = require("path");
const { Client } = require(
  path.resolve(__dirname, "../../backend/node_modules/pg"),
);

const RUN_PREFIX = "codex-retest-" + Date.now() + "-";
const BASE = process.env.TEST_API_URL || "http://localhost:3000";
const ENV_PATH = path.resolve(__dirname, "../../backend/.env");
const ENV_TEXT = fs.readFileSync(ENV_PATH, "utf8");
const DB_URL = ENV_TEXT.match(/^DATABASE_URL=(.+)$/m)[1].trim();

const logLines = [];
function log(line) {
  console.log(line);
  logLines.push(line);
}

const cases = [];
function record(id, title, expected, actual, passed) {
  const status = passed ? "Đạt" : "Lỗi";
  cases.push({ id, title, expected, actual, status });
  log(
    `[${passed ? "PASS" : "FAIL"}] ${id} - ${title}\n  Mong đợi : ${expected}\n  Thực tế  : ${actual}`,
  );
}

async function req(
  urlPath,
  method = "GET",
  body = undefined,
  token = undefined,
) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function cleanRetestUsers(db) {
  const { rows } = await db.query("SELECT id FROM users WHERE email LIKE $1", [
    RUN_PREFIX + "%@example.com",
  ]);
  for (const { id } of rows) {
    await db.query("DELETE FROM notifications WHERE user_id = $1", [id]);
    await db.query("DELETE FROM records WHERE owner_id = $1", [id]);
    await db.query("DELETE FROM plans WHERE owner_id = $1", [id]);
    await db.query("DELETE FROM vehicles WHERE owner_id = $1", [id]);
    await db.query("DELETE FROM categories WHERE owner_id = $1", [id]);
    await db.query("DELETE FROM settings WHERE owner_id = $1", [id]);
    await db.query("DELETE FROM sessions WHERE user_id = $1", [id]);
    await db.query("DELETE FROM password_resets WHERE user_id = $1", [id]);
    await db.query("DELETE FROM users WHERE id = $1", [id]);
  }
}

async function main() {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  await cleanRetestUsers(db);

  const ts = Date.now();
  const email = `${RUN_PREFIX}${ts}@example.com`;
  const secretPass = require("crypto").randomBytes(6).toString("hex") + "A1#";
  const todayStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Bangkok",
  });

  log(
    `=== BẮT ĐẦU KIỂM THỬ HỒI QUY BUG-01 / BUG-02 / BUG-03 (${new Date().toISOString()}) ===`,
  );
  log(`Tài khoản thử: ${email} (mật khẩu và token đã được ẩn)`);

  try {
    const reg = await req("/auth/register", "POST", {
      name: "Người dùng Retest",
      email,
      phone: "0909000111",
      password: secretPass,
    });
    const token = reg.data.accessToken;
    const uid = reg.data.user.id;

    // Chuẩn bị dữ liệu cho BUG-01 & BUG-03:
    // - Xe V1 (active, 15000 km), Xe V2 (archived, 30000 km)
    // - Hạng mục C1 (active), Hạng mục C2 (inactive), Hạng mục C3 (active)
    const v1 = (
      await req(
        "/vehicles",
        "POST",
        { brand: "Toyota", model: "Vios", odometer: 15000 },
        token,
      )
    ).data;
    const v2 = (
      await req(
        "/vehicles",
        "POST",
        { brand: "Ford", model: "Everest", odometer: 30000 },
        token,
      )
    ).data;
    await req(`/vehicles/${v2.id}/archive`, "POST", { archived: true }, token);

    const c1 = (
      await req(
        "/categories",
        "POST",
        { name: "Hạng mục C1 đang dùng", active: true },
        token,
      )
    ).data;
    const c2 = (
      await req(
        "/categories",
        "POST",
        { name: "Hạng mục C2 ngừng dùng", active: false },
        token,
      )
    ).data;
    const c3 = (
      await req(
        "/categories",
        "POST",
        { name: "Hạng mục C3 cho kế hoạch", active: true },
        token,
      )
    ).data;

    // Tạo bản ghi độc lập R1 trên V1 (15000 km) và C1, chi phí 250000
    const r1 = (
      await req(
        "/records",
        "POST",
        {
          vehicle_id: v1.id,
          category_id: c1.id,
          performed_date: todayStr,
          odometer: 15000,
          cost: 250000,
          content: "Bảo dưỡng định kỳ trên xe V1",
        },
        token,
      )
    ).data;

    // -----------------------------------------------------------------------
    // BUG-01A (Bị chặn): PATCH /records/:id đổi vehicle_id sang xe đã lưu trữ khác (V2) kèm km cao hơn (35000)
    // -----------------------------------------------------------------------
    const patchToArchivedVeh = await req(
      `/records/${r1.id}`,
      "PATCH",
      {
        vehicle_id: v2.id,
        category_id: c1.id,
        performed_date: todayStr,
        odometer: 35000,
        cost: 999999,
        content: "Thử chuyển sang xe lưu trữ V2",
      },
      token,
    );
    const dbR1AfterVehAttempt = (
      await db.query(
        "SELECT vehicle_id, category_id, odometer, cost FROM records WHERE id = $1",
        [r1.id],
      )
    ).rows[0];
    const dbV2AfterVehAttempt = (
      await db.query("SELECT odometer, archived FROM vehicles WHERE id = $1", [
        v2.id,
      ])
    ).rows[0];

    // Khôi phục lại R1 và V2 nếu backend chưa sửa làm bẩn dữ liệu để các ca tiếp theo độc lập
    if (patchToArchivedVeh.status === 200) {
      await db.query(
        "UPDATE records SET vehicle_id = $1, category_id = $2, odometer = 15000, cost = 250000 WHERE id = $3",
        [v1.id, c1.id, r1.id],
      );
      await db.query("UPDATE vehicles SET odometer = 30000 WHERE id = $1", [
        v2.id,
      ]);
    }

    record(
      "TC-38A (BUG-01 - Bị chặn)",
      "Sửa bản ghi (PATCH /records/:id) chuyển sang xe khác đang lưu trữ phải bị chặn và không làm đổi dữ liệu/km",
      `HTTP 400; record giữ vehicle_id=${v1.id}, odometer=15000, cost=250000; xe lưu trữ V2 giữ odometer=30000`,
      `HTTP ${patchToArchivedVeh.status}; record(vehicle_id=${dbR1AfterVehAttempt.vehicle_id}, odometer=${dbR1AfterVehAttempt.odometer}, cost=${dbR1AfterVehAttempt.cost}); V2.odometer=${dbV2AfterVehAttempt.odometer}`,
      patchToArchivedVeh.status === 400 &&
        dbR1AfterVehAttempt.vehicle_id === v1.id &&
        dbR1AfterVehAttempt.odometer === 15000 &&
        dbR1AfterVehAttempt.cost === 250000 &&
        dbV2AfterVehAttempt.odometer === 30000,
    );

    // -----------------------------------------------------------------------
    // BUG-01B (Bị chặn): PATCH /records/:id đổi category_id sang hạng mục khác đã ngừng sử dụng (C2)
    // -----------------------------------------------------------------------
    const patchToInactiveCat = await req(
      `/records/${r1.id}`,
      "PATCH",
      {
        vehicle_id: v1.id,
        category_id: c2.id,
        performed_date: todayStr,
        odometer: 15200,
        cost: 888888,
        content: "Thử chuyển sang hạng mục ngừng dùng C2",
      },
      token,
    );
    const dbR1AfterCatAttempt = (
      await db.query(
        "SELECT vehicle_id, category_id, odometer, cost FROM records WHERE id = $1",
        [r1.id],
      )
    ).rows[0];
    const dbV1AfterCatAttempt = (
      await db.query("SELECT odometer FROM vehicles WHERE id = $1", [v1.id])
    ).rows[0];

    if (patchToInactiveCat.status === 200) {
      await db.query(
        "UPDATE records SET vehicle_id = $1, category_id = $2, odometer = 15000, cost = 250000 WHERE id = $3",
        [v1.id, c1.id, r1.id],
      );
      await db.query("UPDATE vehicles SET odometer = 15000 WHERE id = $1", [
        v1.id,
      ]);
    }

    record(
      "TC-38B (BUG-01 - Bị chặn)",
      "Sửa bản ghi (PATCH /records/:id) chuyển sang hạng mục khác đã ngừng sử dụng phải bị chặn và không làm đổi dữ liệu/km",
      `HTTP 400; record giữ category_id=${c1.id}, odometer=15000, cost=250000; xe V1 giữ odometer=15000`,
      `HTTP ${patchToInactiveCat.status}; record(category_id=${dbR1AfterCatAttempt.category_id}, odometer=${dbR1AfterCatAttempt.odometer}, cost=${dbR1AfterCatAttempt.cost}); V1.odometer=${dbV1AfterCatAttempt.odometer}`,
      patchToInactiveCat.status === 400 &&
        dbR1AfterCatAttempt.category_id === c1.id &&
        dbR1AfterCatAttempt.odometer === 15000 &&
        dbR1AfterCatAttempt.cost === 250000 &&
        dbV1AfterCatAttempt.odometer === 15000,
    );

    // -----------------------------------------------------------------------
    // BUG-01C (Được phép): Sửa chi phí/ghi chú của bản ghi cũ khi chính xe/hạng mục gốc của bản ghi đó vừa chuyển sang lưu trữ/ngừng dùng
    // -----------------------------------------------------------------------
    await req(`/vehicles/${v1.id}/archive`, "POST", { archived: true }, token);
    await req(
      `/categories/${c1.id}`,
      "PATCH",
      { name: c1.name, active: false },
      token,
    );
    const patchKeepOriginal = await req(
      `/records/${r1.id}`,
      "PATCH",
      {
        vehicle_id: v1.id,
        category_id: c1.id,
        performed_date: todayStr,
        odometer: 15000,
        cost: 320000,
        content: "Cập nhật chi phí cho bản ghi cũ giữ nguyên xe/hạng mục gốc",
      },
      token,
    );
    record(
      "TC-38C (BUG-01 - Được phép)",
      "Sửa nội dung/chi phí của bản ghi cũ khi giữ nguyên xe gốc (đã lưu trữ) và hạng mục gốc (đã ngừng dùng) vẫn được phép",
      "HTTP 200, cost cập nhật thành 320000",
      `HTTP ${patchKeepOriginal.status}, cost=${patchKeepOriginal.data?.cost}`,
      patchKeepOriginal.status === 200 &&
        patchKeepOriginal.data?.cost === 320000,
    );

    // Khôi phục lại V1 active=true để kiểm tra tiếp BUG-03
    await req(`/vehicles/${v1.id}/archive`, "POST", { archived: false }, token);

    // -----------------------------------------------------------------------
    // BUG-03A (Được phép): Sửa kế hoạch hiện có khi hạng mục gốc (C3) đã ngừng sử dụng nhưng không đổi sang hạng mục khác
    // -----------------------------------------------------------------------
    const p1 = (
      await req(
        "/plans",
        "POST",
        {
          vehicle_id: v1.id,
          category_id: c3.id,
          due_km: 20000,
          notes: "Ghi chú ban đầu",
        },
        token,
      )
    ).data;
    // Ngừng sử dụng hạng mục C3 sau khi kế hoạch P1 đã được tạo
    await req(
      `/categories/${c3.id}`,
      "PATCH",
      { name: c3.name, active: false },
      token,
    );

    const patchPlanKeepOriginalCat = await req(
      `/plans/${p1.id}`,
      "PATCH",
      {
        vehicle_id: v1.id,
        category_id: c3.id,
        due_km: 21000,
        notes: "Đã sửa ghi chú và km dự kiến khi giữ nguyên hạng mục gốc",
      },
      token,
    );
    const planEditSource = fs.readFileSync(
      path.resolve(__dirname, "../../mobile/src/app/plan-edit.tsx"),
      "utf8",
    );
    const uiKeepsInitialCat =
      planEditSource.includes("initial?.category_id") ||
      planEditSource.includes("initial.category_id");

    record(
      "TC-40A (BUG-03 - Được phép)",
      "Sửa kế hoạch chưa hoàn thành giữ nguyên hạng mục gốc (đã ngừng sử dụng) vẫn hiển thị chip trên UI và lưu được qua API",
      "API PATCH /plans/:id trả HTTP 200 (due_km=21000); plan-edit.tsx giữ initial?.category_id trong danh sách chọn",
      `API HTTP ${patchPlanKeepOriginalCat.status} (${patchPlanKeepOriginalCat.data?.message || "due_km=" + patchPlanKeepOriginalCat.data?.due_km}); UI giữ initial.category_id=${uiKeepsInitialCat}`,
      patchPlanKeepOriginalCat.status === 200 &&
        patchPlanKeepOriginalCat.data?.due_km === 21000 &&
        uiKeepsInitialCat,
    );

    // -----------------------------------------------------------------------
    // BUG-03B (Bị chặn): Sửa kế hoạch đổi sang hạng mục khác đã ngừng sử dụng (C2) hoặc xe đã lưu trữ (V2)
    // -----------------------------------------------------------------------
    const patchPlanToOtherInactiveCat = await req(
      `/plans/${p1.id}`,
      "PATCH",
      {
        vehicle_id: v1.id,
        category_id: c2.id,
        due_km: 99000,
        notes: "Đổi sang hạng mục ngừng dùng khác C2",
      },
      token,
    );
    const patchPlanToArchivedVeh = await req(
      `/plans/${p1.id}`,
      "PATCH",
      {
        vehicle_id: v2.id,
        category_id: c3.id,
        due_km: 88000,
        notes: "Đổi sang xe đã lưu trữ V2",
      },
      token,
    );
    const dbP1AfterBlocked = (
      await db.query(
        "SELECT vehicle_id, category_id, due_km FROM plans WHERE id = $1",
        [p1.id],
      )
    ).rows[0];

    record(
      "TC-40B (BUG-03 - Bị chặn)",
      "Sửa kế hoạch chuyển sang hạng mục ngừng dùng khác (C2) hoặc xe đã lưu trữ (V2) phải bị chặn và không đổi dữ liệu",
      `Cả 2 trả HTTP 400; plan giữ nguyên vehicle_id=${v1.id}, category_id=${c3.id}`,
      `Đổi sang C2: HTTP ${patchPlanToOtherInactiveCat.status}; Đổi sang V2: HTTP ${patchPlanToArchivedVeh.status}; DB plan(vehicle_id=${dbP1AfterBlocked.vehicle_id}, category_id=${dbP1AfterBlocked.category_id}, due_km=${dbP1AfterBlocked.due_km})`,
      patchPlanToOtherInactiveCat.status === 400 &&
        patchPlanToArchivedVeh.status === 400 &&
        dbP1AfterBlocked.vehicle_id === v1.id &&
        dbP1AfterBlocked.category_id === c3.id,
    );

    // -----------------------------------------------------------------------
    // BUG-02: Vị trí thông báo phản hồi trên màn hình Tài khoản cá nhân (/profile) & bảo toàn dữ liệu khi PATCH /auth/me lỗi
    // -----------------------------------------------------------------------
    const badProfileRes = await req(
      "/auth/me",
      "PATCH",
      {
        name: "Tên không được lưu",
        email: "email-sai-dinh-dang",
        phone: "0999999999",
      },
      token,
    );
    const dbUserAfterBadProfile = (
      await db.query("SELECT name, email, phone FROM users WHERE id = $1", [
        uid,
      ])
    ).rows[0];
    const goodProfileRes = await req(
      "/auth/me",
      "PATCH",
      { name: "Người dùng Retest Đã Lưu", email, phone: "0909111222" },
      token,
    );
    const profileSource = fs.readFileSync(
      path.resolve(__dirname, "../../mobile/src/app/profile.tsx"),
      "utf8",
    );
    const saveBtnIdx = profileSource.indexOf('title="Lưu thông tin"');
    const passHeadingIdx = profileSource.indexOf(
      "<Heading>Đổi mật khẩu</Heading>",
    );
    const firstFeedbackIdx = profileSource.indexOf("<Feedback");
    const feedbackNearProfileCard =
      firstFeedbackIdx !== -1 &&
      saveBtnIdx !== -1 &&
      passHeadingIdx !== -1 &&
      firstFeedbackIdx < passHeadingIdx;

    record(
      "TC-41 (BUG-02 - Phản hồi UI Hồ sơ & Bảo toàn dữ liệu)",
      "PATCH /auth/me lỗi không làm đổi dữ liệu DB; trên màn hình /profile thông báo phản hồi của 'Lưu thông tin' hiển thị ngay tại thẻ Thông tin cá nhân (trước thẻ Đổi mật khẩu)",
      "PATCH sai email trả 400 & giữ nguyên dữ liệu DB; PATCH đúng trả 200; trong profile.tsx có <Feedback /> nằm ngay trong/sau thẻ Thông tin cá nhân (trước thẻ Đổi mật khẩu)",
      `BadEmail: HTTP ${badProfileRes.status} (DB name="${dbUserAfterBadProfile.name}"); GoodPatch: HTTP ${goodProfileRes.status}; FeedbackBeforePasswordCard=${feedbackNearProfileCard}`,
      badProfileRes.status === 400 &&
        dbUserAfterBadProfile.name === "Người dùng Retest" &&
        goodProfileRes.status === 200 &&
        feedbackNearProfileCard,
    );
  } finally {
    await cleanRetestUsers(db);
    await db.end();
  }

  const passCount = cases.filter((c) => c.status === "Đạt").length;
  const failCount = cases.filter((c) => c.status === "Lỗi").length;
  log(
    `\n=== TỔNG KẾT RETEST BUG-01/02/03: ${passCount} ĐẠT, ${failCount} LỖI / ${cases.length} CA ===`,
  );

  if (failCount) process.exitCode = 1;
  const logPath = path.resolve(__dirname, "qa-regressions.log");
  fs.writeFileSync(logPath, logLines.join("\n") + "\n", "utf8");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
