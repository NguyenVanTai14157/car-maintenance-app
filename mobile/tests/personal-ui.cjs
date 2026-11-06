const { chromium, expect } = require("@playwright/test");
const fs = require("node:fs"),
  path = require("node:path");
require("../../backend/node_modules/dotenv").config({
  path: path.resolve(__dirname, "../../backend/.env"),
  quiet: true,
});
const { Pool } = require("../../backend/node_modules/pg");
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const web = process.env.TEST_WEB_URL || "http://localhost:8083",
  base = process.env.TEST_API_URL || "http://127.0.0.1:3001";
const email = `personal-ui-${Date.now()}@example.com`,
  password = "UiTest!12345",
  out = path.resolve(__dirname, "../../docs/test-results");
fs.mkdirSync(out, { recursive: true });
let browser,
  uid,
  count = 0,
  mailFile;
async function api(p, m = "GET", b, t) {
  const r = await fetch(base + p, {
    method: m,
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: "Bearer " + t } : {}),
    },
    body: b ? JSON.stringify(b) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw Error(JSON.stringify(j));
  return j;
}
(async () => {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage();
  page.on("dialog", (d) => d.accept());
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const click = (t) =>
      page.getByRole("button", { name: t, exact: true }).click(),
    field = (l, v) =>
      page.getByLabel(l, { exact: true }).filter({ visible: true }).fill(v),
    show = (t) =>
      expect(
        page.getByText(t, { exact: true }).filter({ visible: true }).first(),
      ).toBeVisible({ timeout: 30000 });
  await page.goto(web + "/login");
  await show("Chào mừng trở lại");
  await page.screenshot({
    path: path.join(out, "personal-login.png"),
    fullPage: true,
  });
  await click("Chưa có tài khoản? Đăng ký");
  await field("Họ và tên", "Người dùng kiểm thử");
  await field("Email", email);
  await field("Mật khẩu", password);
  await click("Đăng ký");
  await show("Xe khỏe, hành trình an tâm");
  count++;
  const u = await api("/auth/login", "POST", { identifier: email, password });
  uid = u.user.id;
  const token = u.accessToken;
  await page.reload();
  await show("Xe khỏe, hành trình an tâm");
  count++;
  await click("Xe của tôi");
  await click("Thêm xe");
  await field("Hãng xe", "Toyota");
  await field("Dòng xe", "Vios");
  await field("Số km hiện tại", "20000");
  await click("Lưu xe");
  await show("Hãng xe: Toyota");
  await show("Dòng xe: Vios");
  count++;
  await click("Xem lịch bảo dưỡng");
  await click("Thêm lịch bảo dưỡng");
  await field("Số km đến hạn (có thể bỏ trống)", "20000");
  await field("Chu kỳ tháng (không bắt buộc)", "6");
  await field("Chu kỳ km (không bắt buộc)", "5000");
  await click("Lưu kế hoạch");
  await show("Đến hạn");
  count++;
  await page.screenshot({
    path: path.join(out, "personal-plan.png"),
    fullPage: true,
  });
  await click("Ghi nhận đã bảo dưỡng");
  await field("Chi phí (VND, nhập 0 nếu không phát sinh)", "500000");
  await field("Nội dung bảo dưỡng", "Thay dầu tại garage gần nhà");
  await click("Lưu bản ghi bảo dưỡng");
  await show("Chi tiết bảo dưỡng");
  await show("Đề xuất lần bảo dưỡng tiếp theo");
  count++;
  await click("Xác nhận tạo lịch tiếp theo");
  await show("Chưa đến hạn");
  count++;
  await page.goto(web + "/costs");
  await show("500.000 ₫");
  await click("Theo năm");
  await show(String(new Date().getFullYear()));
  await field("Từ ngày (YYYY-MM-DD)", "2099-01-01");
  await show("0 ₫");
  count++;
  await page.goto(web + "/records");
  await field("Tìm nội dung / biển số", "không có");
  await show("Chưa có lịch sử bảo dưỡng.");
  await field("Tìm nội dung / biển số", "Thay dầu");
  await click("Xem chi tiết bản ghi");
  await click("Sửa bản ghi");
  await field("Chi phí (VND, nhập 0 nếu không phát sinh)", "550000");
  await click("Lưu bản ghi bảo dưỡng");
  await show("550.000 ₫");
  count++;
  await page.goto(web + "/settings");
  await show("Sao lưu dữ liệu cá nhân");
  const downloadPromise = page.waitForEvent("download");
  await click("Xuất file sao lưu");
  const download = await downloadPromise,
    saved = path.join(out, "personal-backup.json");
  await download.saveAs(saved);
  if (JSON.parse(fs.readFileSync(saved, "utf8")).records.length !== 1)
    throw Error("Wrong backup");
  count++;
  const chooserPromise = page.waitForEvent("filechooser");
  await click("Khôi phục từ file");
  await (await chooserPromise).setFiles(saved);
  await show("Đã khôi phục dữ liệu.");
  count++;
  const restored = (await api("/records", "GET", null, token))[0],
    plan = (await api("/plans", "GET", null, token)).find(
      (x) => x.completed_record_id === restored.id,
    );
  await page.goto(web + "/record?id=" + restored.id);
  await click("Xóa bản ghi");
  await show("Lịch sử bảo dưỡng");
  await page.goto(web + "/plan?id=" + plan.id);
  await show("Đến hạn");
  count++;
  await page.goto(web + "/profile");
  await click("Đăng xuất");
  await show("Chào mừng trở lại");
  await click("Quên mật khẩu?");
  await field("Email khôi phục", email);
  await click("Gửi hướng dẫn khôi phục");
  await show(
    "Nếu email đã được đăng ký, hướng dẫn khôi phục sẽ được gửi đến email đó.",
  );
  const dir = path.resolve(__dirname, "../../.local-backups/mail-preview"),
    found = fs
      .readdirSync(dir)
      .map((n) => ({
        file: path.join(dir, n),
        data: JSON.parse(fs.readFileSync(path.join(dir, n), "utf8")),
      }))
      .find((x) => x.data.to === email);
  if (!found) throw Error("No preview");
  mailFile = found.file;
  await click("Tôi đã có mã khôi phục");
  await field("Mã khôi phục", found.data.token);
  await field("Mật khẩu mới", "ChangedUi!123");
  await field("Nhập lại mật khẩu mới", "ChangedUi!123");
  await click("Đặt lại mật khẩu");
  await show("Đã đặt lại mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.");
  await click("Về đăng nhập");
  await field("Email", email);
  await field("Mật khẩu", "ChangedUi!123");
  await click("Đăng nhập");
  await show("Xe khỏe, hành trình an tâm");
  count++;
  await page.screenshot({
    path: path.join(out, "personal-home.png"),
    fullPage: true,
  });
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    `PASS ${count} browser workflows, no runtime errors; screenshots in docs/test-results`,
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (!uid)
      uid = (await db.query("SELECT id FROM users WHERE email=$1", [email]))
        .rows[0]?.id;
    if (uid) {
      await db.query("DELETE FROM notifications WHERE user_id=$1", [uid]);
      for (const t of [
        "records",
        "plans",
        "vehicles",
        "categories",
        "settings",
      ])
        await db.query(`DELETE FROM ${t} WHERE owner_id=$1`, [uid]);
      await db.query("DELETE FROM users WHERE id=$1", [uid]);
    }
    if (mailFile) fs.rmSync(mailFile, { force: true });
    await db.end();
  });
