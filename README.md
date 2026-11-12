# AutoCare — lịch bảo dưỡng ô tô cá nhân

App điện thoại dành cho **Người dùng cá nhân**, web riêng dành cho **Quản trị viên**. Mỗi tài khoản quản lý xe, kế hoạch, lịch sử và chi phí riêng. React Native/Expo Router SDK 58 + TypeScript, NestJS 11 + PostgreSQL 17; cập nhật giữa các thiết bị cùng tài khoản qua Socket.IO.

Bản cá nhân và web admin được lưu tại repo [car-maintenance-app](https://github.com/NguyenVanTai14157/car-maintenance-app), nhánh `main` trên GitHub. Bản gara bốn vai trò được giữ riêng tại repo `NguyenVanTai14157/car-maintenance-app-gara`. Database cũ `car_maintenance` được giữ nguyên; bản này dùng **`car_maintenance_personal`**, không chạy migration mới trên database cũ.

## Web admin và backend dùng chung

Bố cục gốc gồm `admin-web/` (web quản trị Next.js), `mobile/` (app cá nhân), `backend/` (API NestJS dùng chung). Phần API admin đã ghép vào `backend/src/modules/admin/`, danh mục hãng/dòng/loại xe ở `backend/src/modules/catalog/`; giao diện Next.js + Ant Design đã triển khai, chạy ở cổng 3001. Xem [API admin](docs/ADMIN-BACKEND.md).

Backend có thêm migration 002/003 và script `npm run admin:create` để tạo admin đầu tiên bằng biến môi trường local. Không có tài khoản admin mặc định. Khởi động lại backend để nạp mã/schema mới; không cần đổi database cá nhân đang dùng.

## Chạy trên máy hiện tại

Đã cài dependencies và cấu hình database cá nhân trong `backend/.env`. Dừng backend/Expo cũ trước khi khởi động lại vì bản này thay đổi schema và thư viện. Mở hai terminal trong Antigravity hoặc VS Code:

```powershell
cd D:\car-maintenance-app\backend
npm run dev
```

```powershell
cd D:\car-maintenance-app\mobile
npm start -- --lan
```

Giữ hai terminal chạy, điện thoại và laptop cùng Wi-Fi. Android mở Expo Go quét QR; iPhone quét bằng Camera rồi mở Expo Go. Nếu Expo Go yêu cầu, đăng nhập cùng tài khoản Expo với Expo CLI. Đây là tài khoản công cụ; tài khoản AutoCare đăng ký riêng trong ứng dụng. Máy ảo Android: chọn terminal Expo và bấm `a` (Shift+A chọn thiết bị nếu mở nhiều máy ảo). Fast Refresh cập nhật khi lưu; `r` tải lại toàn bộ. Không cần chạy nhiều backend cho nhiều điện thoại.

App tự dùng địa chỉ laptop từ Expo, cổng API 3000. Chỉ cấu hình `EXPO_PUBLIC_API_URL` trong `mobile/.env` khi cần ghi đè; máy ảo có thể dùng `http://10.0.2.2:3000`. Khi đổi .env cần khởi động lại Expo. QR tunnel chỉ chuyển gói Expo, không tự mở backend ra Internet.

**Không còn tài khoản mẫu bốn role.** Chọn Đăng ký với email và mật khẩu ít nhất 8 ký tự. Mỗi tài khoản mới có sẵn bốn hạng mục bảo dưỡng, chưa có xe/lịch sử mẫu.

## Quên mật khẩu bằng hộp thư thử

`MAIL_MODE=preview` đang được cấu hình. Sau khi gửi yêu cầu trong app, mở file JSON mới nhất tại `.local-backups/mail-preview/` ở thư mục gốc dự án, kiểm tra trường `to`, sao chép `token` vào màn hình **Tôi đã có mã khôi phục** và đặt mật khẩu mới. Mã dùng một lần, hết hạn sau 15 phút; đặt lại mật khẩu kết thúc mọi phiên cũ. API không trả mã, database chỉ lưu hash mã.

Hộp thư này **không gửi email đến Gmail**. Khi có SMTP, đổi `MAIL_MODE=smtp` và cấu hình `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` theo `backend/.env.example`. Preview bị chặn khi `NODE_ENV=production`. Không commit .env hoặc hộp thư thử.

## Chức năng

- Đăng ký/đăng nhập, hồ sơ, đổi mật khẩu, đăng xuất, khôi phục mật khẩu.
- Thêm/sửa xe và cập nhật km; xóa xe chưa có dữ liệu hoặc lưu trữ xe có lịch sử.
- Quản lý hạng mục cá nhân, ngừng sử dụng hạng mục đã dùng.
- Dashboard và kế hoạch theo ngày và/hoặc km; ngưỡng nhắc riêng cho từng kế hoạch.
- Ghi nhận thực tế, chi phí, nội dung, ghi chú và nhiều ảnh hóa đơn/phụ tùng tùy chọn.
- Lịch sử tìm kiếm/lọc; chi phí theo xe, thời gian, tháng/năm/hạng mục.
- Xác nhận đề xuất lịch tiếp theo theo chu kỳ từ ngày/km thực hiện thực tế.
- Cài đặt thông báo, xuất/khôi phục file JSON (thay thế dữ liệu cá nhân sau xác nhận).

## Quy tắc nghiệp vụ

Xem [đặc tả bản cá nhân](docs/PERSONAL-SPEC.md). Hai ngưỡng ngày/km độc lập: đạt một ngưỡng là đến hạn, vượt một ngưỡng là quá hạn; lý do hiển thị rõ theo ngày hoặc km hoặc cả hai. Không tự hoàn thành theo ngày dự kiến. Lưu bản ghi từ kế hoạch mới hoàn thành lịch đó. Xóa bản ghi sẽ mở lại kế hoạch theo ngưỡng hiện tại. Lịch tiếp theo đã tạo là kế hoạch độc lập; sửa bản ghi nguồn không tự đổi lịch đó.

## Cấu trúc

```text
backend/
  migrations/001_personal.sql
  src/
    common/                   # guard, filter, validation, request types
    database/                 # pool, transaction, migrations
    modules/
      auth/                   # controller, service, repository, recovery
      personal/               # vehicles/categories/plans/records/settings/backup
                              # controller -> service -> repository; rules thuần
      realtime/               # xác thực socket, PostgreSQL LISTEN/NOTIFY
    scripts/
  tests/personal.cjs
mobile/
  src/app/                    # Expo Router, mỗi file một màn hình
  src/components/             # field/card/chips/plan dùng chung
  src/hooks/                  # session, tải dữ liệu và realtime invalidation
  src/services/               # API, secure token, reminders, backup native/web
  tests/
docs/
  archive/four-role/          # tài liệu lịch sử, không áp dụng cho bản mới
```

Backend dùng SQL parameterized và repository tập trung cho miền cá nhân. Mọi truy vấn/mutation lọc owner_id từ phiên đăng nhập; không tin owner/role từ client. Các thay đổi liên quan trong transaction và khóa theo tài khoản để tránh hoàn thành trùng. Trạng thái đến hạn được tính từ dữ liệu thay vì lưu một chuỗi dễ lỗi thời.

## Cài trên máy khác

Làm theo [hướng dẫn cài trên PC](docs/GITHUB-SETUP.md), gồm backend, mobile và web admin. GitHub lưu mã nguồn; database và cấu hình riêng không được đưa lên repo. Backend tự áp dụng migration khi khởi động; `npm run seed` chỉ kiểm tra schema, không tạo dữ liệu tài khoản mẫu.

## Kiểm thử

Backend thử riêng, tránh cổng đang dùng:

```powershell
cd D:\car-maintenance-app\backend
$env:PORT='3001'
npm run dev
```

Terminal khác, cùng thư mục backend: `npm test`, `npm run build`, `npm run format:check`. Test mặc định gọi `http://127.0.0.1:3001`, tạo và dọn tài khoản thử; chỉ chạy database phát triển có tên chứa `personal`.

Giao diện: trong terminal mobile đặt `$env:EXPO_PUBLIC_API_URL='http://127.0.0.1:3001'`, chạy `npm run web -- --port 8083`; terminal mobile khác chạy `npm run test:ui`. Cần Microsoft Edge. Chạy thêm `npm run typecheck`, `npm run lint`, `npm run test:notifications`. Xem [báo cáo kiểm thử](docs/TEST-REPORT.md).

## Giới hạn hiện tại

Dữ liệu nghiệp vụ cần kết nối backend, chưa hỗ trợ ghi ngoại tuyến. Thông báo là hộp thư trong app và nhắc cục bộ trên thiết bị đã cấp quyền, chưa có remote push. Km do người dùng tự cập nhật. Nhắc ngày lên lịch 50 thông báo gần nhất/thiết bị, làm mới khi mở app và khi dữ liệu thay đổi. Thiết bị bị tắt quyền, force-stop hoặc giới hạn pin có thể không giao thông báo đúng giờ; cần kiểm thử thiết bị thật trước phát hành.

Đơn vị km, tiền VND; mốc ngày và giờ nhắc UTC+7. Trên app chọn ngày bằng lịch, hiển thị ngày/tháng/năm; API vẫn lưu YYYY-MM-DD. Ô số có đơn vị cố định ở cuối ô. Ảnh JPEG/PNG tùy chọn, mỗi ảnh khoảng 2MB trở xuống, một bản ghi 10 ảnh. Khôi phục JSON tối đa 28MB, kiểm tra toàn bộ trước khi thay dữ liệu. Đây là bản phát triển; chưa triển khai HTTPS/server công khai hoặc cấu hình SMTP thật.
