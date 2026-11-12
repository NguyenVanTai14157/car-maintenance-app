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
  await page
    .getByRole("checkbox", { name: "Ghi nhớ tài khoản", exact: true })
    .click();
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
  await click("Thêm xe");
  await show("Thêm phương tiện");
  await expect(
    page.getByRole("button", { name: "Thêm xe", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Đang sử dụng", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Xem lịch bảo dưỡng", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Thông tin xe", { exact: true })).toHaveCount(0);
  await field("Hãng xe", "Không lưu xe này");
  await click("Hủy");
  await show("Hãng xe: Toyota");
  await expect(
    page.getByText("Hãng xe: Không lưu xe này", { exact: true }),
  ).toHaveCount(0);
  await click("Thêm xe");
  await expect(page.getByLabel("Hãng xe", { exact: true })).toHaveValue("");
  await click("Quay lại");
  await show("Hãng xe: Toyota");
  await click("Sửa / cập nhật số km");
  await show("Sửa thông tin xe");
  await expect(
    page.getByRole("button", { name: "Xem lịch bảo dưỡng", exact: true }),
  ).toHaveCount(0);
  await field("Ghi chú", "Xe đã sửa thông tin");
  const photoData = await page.evaluate(() =>
    ["#E53935", "#1E88E5"].map((color) => {
      const canvas = document.createElement("canvas");
      canvas.width = 8;
      canvas.height = 8;
      const context = canvas.getContext("2d");
      context.fillStyle = color;
      context.fillRect(0, 0, 8, 8);
      return canvas.toDataURL("image/png").split(",")[1];
    }),
  );
  const photoFiles = photoData.map((data, index) => {
    const file = path.join(out, `vehicle-photo-${index}.png`);
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    return file;
  });
  const photosChooser = page.waitForEvent("filechooser");
  await click("Chọn ảnh xe");
  await (await photosChooser).setFiles(photoFiles);
  await show("Ảnh xe (2)");
  await click("Lưu xe");
  await show("Ghi chú: Xe đã sửa thông tin");
  await show("Ảnh xe (2):");
  await click("Xem ảnh xe 1");
  await show("Ảnh xe 1/2");
  await click("Ảnh tiếp");
  await show("Ảnh xe 2/2");
  await click("Ảnh trước");
  await show("Ảnh xe 1/2");
  await click("Đóng ảnh");
  await click("Sửa / cập nhật số km");
  await show("Ảnh xe (2)");
  await click("Bỏ ảnh 1");
  await show("Ảnh xe (1)");
  const morePhotosChooser = page.waitForEvent("filechooser");
  await click("Thêm ảnh xe");
  await (await morePhotosChooser).setFiles(photoFiles[0]);
  await show("Ảnh xe (2)");
  await click("Lưu xe");
  await show("Ảnh xe (2):");
  const galleryVehicle = (await api("/vehicles", "GET", null, token))[0];
  if (
    galleryVehicle.images.length !== 2 ||
    galleryVehicle.image !== galleryVehicle.images[0]
  )
    throw Error("Vehicle gallery was not persisted");
  count++;
  await click("Xem lịch bảo dưỡng");
  await click("Thêm lịch bảo dưỡng");
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Bangkok",
  });
  await field("Ngày dự kiến (có thể bỏ trống)", "2028-02-29");
  await click("Xóa ngày dự kiến (có thể bỏ trống)");
  await expect(
    page.getByLabel("Ngày dự kiến (có thể bỏ trống)", { exact: true }),
  ).toHaveValue("");
  await field("Ngày dự kiến (có thể bỏ trống)", today);
  await field("Số km đến hạn (có thể bỏ trống)", "20000");
  await expect(
    page.getByLabel("Số km đến hạn (có thể bỏ trống)", { exact: true }),
  ).toHaveValue("20000");
  await field("Chu kỳ tháng (không bắt buộc)", "6");
  await field("Chu kỳ km (không bắt buộc)", "5000");
  await click("+ Thêm hạng mục");
  await click("Lưu và chọn hạng mục");
  await show("Vui lòng nhập tên hạng mục.");
  await click("Hủy thêm hạng mục");
  await expect(
    page.getByLabel("Số km đến hạn (có thể bỏ trống)", { exact: true }),
  ).toHaveValue("20000");
  await click("+ Thêm hạng mục");
  const categoryName = "Vệ sinh điều hòa kiểm thử";
  await field("Tên hạng mục mới", categoryName);
  await click("Lưu và chọn hạng mục");
  await show(categoryName);
  await expect(
    page.getByLabel("Ngày dự kiến (có thể bỏ trống)", { exact: true }),
  ).toHaveValue(today);
  await expect(
    page.getByLabel("Số km đến hạn (có thể bỏ trống)", { exact: true }),
  ).toHaveValue("20000");
  await click("Lưu lịch bảo dưỡng");
  await show("Đến hạn theo ngày và km");
  const savedPlan = (await api("/plans", "GET", null, token))[0];
  if (savedPlan.due_date !== today || savedPlan.due_km !== 20000)
    throw Error("Date/km serialization changed");
  if (savedPlan.category_name !== categoryName)
    throw Error("New category was not selected for the plan");
  await expect(
    page.getByRole("button", { name: "Xem chi tiết lịch", exact: true }),
  ).toHaveCount(0);
  await page.goto(web + "/plans");
  await click("Xem chi tiết lịch");
  await expect(page).toHaveURL(new RegExp(`/plan\\?id=${savedPlan.id}$`));
  await show("Chi tiết lịch bảo dưỡng");
  await expect(
    page.getByRole("button", { name: "Xem chi tiết lịch", exact: true }),
  ).toHaveCount(0);
  count++;
  await page.screenshot({
    path: path.join(out, "personal-plan.png"),
    fullPage: true,
  });
  await click("Ghi nhận đã bảo dưỡng");
  await expect(
    page.getByLabel("Ngày thực hiện", { exact: true }),
  ).toHaveAttribute("max", today);
  await field("Chi phí", "500.000");
  await expect(page.getByLabel("Chi phí", { exact: true })).toHaveValue(
    "500000",
  );
  await field("Nội dung bảo dưỡng", "Thay dầu tại garage gần nhà");
  await click("Lưu thông tin bảo dưỡng");
  await show("Chi tiết bảo dưỡng");
  await show("Đề xuất lần bảo dưỡng tiếp theo");
  count++;
  await click("Tạo lịch bảo dưỡng tiếp theo");
  await show("Chưa đến hạn");
  count++;
  const zeroRecord = await api(
    "/records",
    "POST",
    {
      vehicle_id: savedPlan.vehicle_id,
      category_id: savedPlan.category_id,
      performed_date: today,
      odometer: 20000,
      cost: 0,
      content: "Kiểm tra miễn phí",
    },
    token,
  );
  await page.goto(web + "/home");
  await click("Xem lịch sử chi phí: 500.000 ₫");
  await expect(page).toHaveURL(/\/records\?withCost=1$/);
  await show("Tổng chi phí: 500.000 ₫");
  await expect(
    page
      .getByRole("button", { name: "Xem chi tiết bảo dưỡng", exact: true })
      .filter({ visible: true }),
  ).toHaveCount(1);
  await expect(
    page.getByText("Chi phí: 0 ₫", { exact: true }).filter({ visible: true }),
  ).toHaveCount(0);
  await click("Tất cả lịch sử");
  await show("Chi phí: 0 ₫");
  await expect(
    page
      .getByText("Nội dung bảo dưỡng: Kiểm tra miễn phí", { exact: true })
      .filter({ visible: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("button", { name: "Xem chi tiết bảo dưỡng", exact: true })
      .filter({ visible: true }),
  ).toHaveCount(2);
  await click("Có phát sinh chi phí");
  await click("Xem chi tiết bảo dưỡng");
  await show("Chi phí: 500.000 ₫");
  await api("/records/" + zeroRecord.id, "DELETE", null, token);
  count++;
  await page.goto(web + "/costs");
  await show("Tổng chi phí: 500.000 ₫");
  const costYear = Number(today.slice(0, 4)),
    costMonth = Number(today.slice(5, 7));
  await click("Chọn tháng");
  await click(`Chọn tháng ${costMonth} năm ${costYear}`);
  await show("Tổng chi phí: 500.000 ₫");
  await click(`Tháng ${costMonth}/${costYear}`);
  await click("Năm tiếp theo");
  await click(`Chọn tháng ${costMonth} năm ${costYear + 1}`);
  await show("Chưa có chi phí trong khoảng này.");
  await click("Xem tất cả các tháng");
  await show("Tổng chi phí: 500.000 ₫");
  await click("Theo năm");
  await click("Chọn năm");
  await click("Năm tiếp theo");
  await click(`Xem năm ${costYear + 1}`);
  await show("Chưa có chi phí trong khoảng này.");
  await click("Xem tất cả các năm");
  await show(`Năm ${new Date().getFullYear()}`);
  await field("Từ ngày", "2099-01-01");
  await expect(page.getByLabel("Đến ngày", { exact: true })).toHaveAttribute(
    "min",
    "2099-01-01",
  );
  await show("Chưa có chi phí trong khoảng này.");
  await click("Xóa từ ngày");
  await show("Tổng chi phí: 500.000 ₫");
  await expect(
    page.getByRole("button", {
      name: "Xem các lần bảo dưỡng theo bộ lọc",
      exact: true,
    }),
  ).toHaveCount(0);
  const costRecord = (await api("/records", "GET", null, token))[0];
  await click(`Xem chi phí lần bảo dưỡng ${costRecord.id}`);
  await expect(page).toHaveURL(new RegExp(`/record\\?id=${costRecord.id}$`));
  await show("Chi tiết bảo dưỡng");
  await page.goto(web + "/costs");
  await field("Từ ngày", today);
  await field("Đến ngày", today);
  await expect(
    page.getByLabel("Từ ngày", { exact: true }).filter({ visible: true }),
  ).toHaveValue(today);
  await expect(
    page.getByLabel("Đến ngày", { exact: true }).filter({ visible: true }),
  ).toHaveValue(today);
  await show("Chi phí: 500.000 ₫");
  count++;
  await page.goto(web + "/records");
  await field("Tìm nội dung / biển số", "không có");
  await show("Chưa có lịch sử bảo dưỡng.");
  await field("Tìm nội dung / biển số", "Thay dầu");
  await click("Xem chi tiết bảo dưỡng");
  await click("Sửa thông tin bảo dưỡng");
  await field("Chi phí", "550000");
  await click("Lưu thông tin bảo dưỡng");
  await show("Chi phí: 550.000 ₫");
  count++;
  await page.goto(web + "/settings");
  await show("Sao lưu dữ liệu cá nhân");
  const downloadPromise = page.waitForEvent("download");
  await click("Lưu bản sao dự phòng");
  const download = await downloadPromise,
    saved = path.join(out, "personal-backup.json");
  await download.saveAs(saved);
  if (JSON.parse(fs.readFileSync(saved, "utf8")).records.length !== 1)
    throw Error("Wrong backup");
  if (
    JSON.parse(fs.readFileSync(saved, "utf8")).vehicles[0].images.length !== 2
  )
    throw Error("Vehicle photos missing from backup");
  count++;
  const chooserPromise = page.waitForEvent("filechooser");
  await click("Khôi phục dữ liệu");
  await (await chooserPromise).setFiles(saved);
  await show("Đã khôi phục dữ liệu.");
  count++;
  const restored = (await api("/records", "GET", null, token))[0],
    plan = (await api("/plans", "GET", null, token)).find(
      (x) => x.completed_record_id === restored.id,
    );
  await page.goto(web + "/record?id=" + restored.id);
  await click("Xóa lần bảo dưỡng này");
  await show("Lịch sử bảo dưỡng");
  await page.goto(web + "/plan?id=" + plan.id);
  await show("Đến hạn theo ngày và km");
  count++;
  await page.goto(web + "/profile");
  await click("Đăng xuất");
  await show("Chào mừng trở lại");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveValue("");
  await expect(
    page.getByRole("checkbox", { name: "Ghi nhớ tài khoản", exact: true }),
  ).toBeChecked();
  await page.reload();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveValue("");
  if (
    (await page.evaluate(() =>
      localStorage.getItem("autocare.remembered-email"),
    )) !== email
  )
    throw Error("Email was not remembered");
  if (
    await page.evaluate(
      (p) => Object.values(localStorage).some((value) => value.includes(p)),
      password,
    )
  )
    throw Error("Password persisted in local storage");
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
  // Dashboard counts vehicles, even when one vehicle has several matching plans.
  const dashboardToken = (
    await api("/auth/login", "POST", {
      identifier: email,
      password: "ChangedUi!123",
    })
  ).accessToken;
  const currentVehicles = await api("/vehicles", "GET", null, dashboardToken);
  const currentCategories = await api(
    "/categories",
    "GET",
    null,
    dashboardToken,
  );
  const originalVehicle = currentVehicles[0];
  const otherVehicle = await api(
    "/vehicles",
    "POST",
    { brand: "Honda", model: "City", odometer: 1000 },
    dashboardToken,
  );
  await api(
    "/vehicles",
    "POST",
    { brand: "Mazda", model: "3", odometer: 2000 },
    dashboardToken,
  );
  const offsetDate = (days) =>
    new Date(Date.parse(today + "T00:00:00Z") + days * 86400000)
      .toISOString()
      .slice(0, 10);
  const common = {
    category_id: currentCategories[0].id,
    remind_days: 7,
    remind_km: 500,
  };
  for (let i = 0; i < 2; i++)
    await api(
      "/plans",
      "POST",
      {
        ...common,
        vehicle_id: originalVehicle.id,
        due_date: offsetDate(8),
        due_km: 4000,
      },
      dashboardToken,
    );
  await api(
    "/plans",
    "POST",
    { ...common, vehicle_id: otherVehicle.id, due_date: offsetDate(2) },
    dashboardToken,
  );
  await page.goto(web + "/home");
  await expect(
    page.getByRole("button", { name: "Xe đang sử dụng: 3 xe", exact: true }),
  ).toBeVisible();
  await click("Quá hạn: 1 xe");
  await show("Xe quá hạn bảo dưỡng");
  await show("Hãng xe: Toyota");
  await expect(
    page.getByText("Hãng xe: Honda", { exact: true }).filter({ visible: true }),
  ).toHaveCount(0);
  await click("Xem lịch bảo dưỡng");
  await expect(
    page
      .getByRole("button", { name: "Xem chi tiết lịch", exact: true })
      .filter({ visible: true }),
  ).toHaveCount(2);
  await show("Quá hạn theo km: vượt 16.000 km");
  await page.goto(web + "/home");
  await click("Sắp đến hạn: 1 xe");
  await show("Xe sắp đến hạn bảo dưỡng");
  await show("Hãng xe: Honda");
  await expect(
    page
      .getByText("Hãng xe: Toyota", { exact: true })
      .filter({ visible: true }),
  ).toHaveCount(0);
  await click("Xem lịch bảo dưỡng");
  await show("Sắp đến hạn: còn 2 ngày");
  await page.goto(web + "/home");
  await click("Đến hạn: 1 xe");
  await show("Xe đến hạn bảo dưỡng");
  await show("Hãng xe: Toyota");
  await page.goto(web + "/home");
  await click("Xe đang sử dụng: 3 xe");
  await show("Xe của tôi");
  await expect(
    page.getByText("Thông tin xe", { exact: true }).filter({ visible: true }),
  ).toHaveCount(3);
  count++;
  await page.goto(web + "/home");
  await expect(
    page.getByRole("button", { name: "Xe đang sử dụng: 3 xe", exact: true }),
  ).toBeVisible();
  const checkNoHorizontalOverflow = async () => {
    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      content: document.documentElement.scrollWidth,
    }));
    if (dimensions.content > dimensions.viewport + 1)
      throw Error(`Horizontal overflow: ${JSON.stringify(dimensions)}`);
  };
  for (const viewport of [
    { width: 320, height: 740 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const tiles = [
      "Xe đang sử dụng: 3 xe",
      "Quá hạn: 1 xe",
      "Đến hạn: 1 xe",
      "Sắp đến hạn: 1 xe",
    ];
    for (const label of tiles) {
      const tile = page.getByRole("button", { name: label, exact: true });
      await expect(tile).toBeVisible();
      const box = await tile.boundingBox();
      if (
        !box ||
        box.x < 0 ||
        box.x + box.width > viewport.width + 1 ||
        box.height < 44
      )
        throw Error(`Tile outside viewport: ${label}`);
    }
    await checkNoHorizontalOverflow();
    await page.screenshot({
      path: path.join(out, `personal-home-${viewport.width}.png`),
      fullPage: true,
    });
  }
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/plan-edit",
      "/record-edit",
      "/records",
      "/costs",
      "/vehicles",
      "/settings",
      "/profile",
    ]) {
      await page.goto(web + route);
      await expect(
        page.getByRole("button", { name: "Quay lại", exact: true }),
      ).toBeVisible();
      if (
        ["/plan-edit", "/record-edit", "/settings", "/profile"].includes(route)
      )
        await expect(page.getByRole("textbox").first()).toBeVisible();
      if (route === "/vehicles") await show("Hãng xe: Toyota");
      if (route === "/records" || route === "/costs")
        await expect(page.getByLabel("Từ ngày", { exact: true })).toBeVisible();
      await checkNoHorizontalOverflow();
    }
  }
  count++;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(web + "/home");
  await expect(
    page.getByRole("button", { name: "Xe đang sử dụng: 3 xe", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(out, "personal-home.png"),
    fullPage: true,
  });
  await page.goto(web + "/profile");
  await click("Đăng xuất");
  await show("Chào mừng trở lại");
  await page
    .getByRole("checkbox", { name: "Ghi nhớ tài khoản", exact: true })
    .click();
  await field("Mật khẩu", "ChangedUi!123");
  await click("Đăng nhập");
  await show("Xe khỏe, hành trình an tâm");
  await page.goto(web + "/profile");
  await click("Đăng xuất");
  await show("Chào mừng trở lại");
  await page.reload();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("");
  await expect(
    page.getByRole("checkbox", { name: "Ghi nhớ tài khoản", exact: true }),
  ).not.toBeChecked();
  count++;
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
