# Lấy code và chạy trên PC mới

Repo: [NguyenVanTai14157/car-maintenance-app](https://github.com/NguyenVanTai14157/car-maintenance-app), nhánh `main`. Repo `car-maintenance-app-gara` giữ bản gara cũ.

## Chuẩn bị và tải code

Cài Git, Node.js 22 (từ 22.18 trở lên trong dòng 22), PostgreSQL 17 và Expo Go trên điện thoại. Android Studio chỉ cần nếu muốn chạy máy ảo. Ví dụ lưu code tại ổ D, dùng PowerShell:

```powershell
cd D:\
git clone https://github.com/NguyenVanTai14157/car-maintenance-app.git
cd car-maintenance-app
```

Lần đầu dùng `git clone`; những lần sau dùng `git pull` trong thư mục dự án. Commit thay đổi trên máy hiện tại trước khi pull. Một backend phục vụ cả mobile và web admin.

## Database và backend

Trong pgAdmin tạo database trống `car_maintenance_personal`. Không dùng database gara cũ `car_maintenance`.

```powershell
cd D:\car-maintenance-app\backend
Copy-Item .env.example .env
npm ci
```

Mở `backend/.env`, sửa `DATABASE_URL` theo username, mật khẩu và cổng PostgreSQL trên PC. Thay `JWT_SECRET` bằng chuỗi ngẫu nhiên ít nhất 32 ký tự. Có thể tạo chuỗi rồi tự dán vào file:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run dev
```

Backend chạy cổng **3000**, tự tạo/cập nhật bảng khi khởi động. Giữ terminal này mở. Database mới chưa có tài khoản hay xe; đăng ký trong app để sử dụng.

`MAIL_MODE=preview` lưu thư khôi phục tại `.local-backups/mail-preview/` ở thư mục gốc, không gửi email đến Gmail. Không chia sẻ thư chứa mã khôi phục.

## Mobile và mã QR

Mở terminal thứ hai:

```powershell
cd D:\car-maintenance-app\mobile
npm ci
npm start -- --lan
```

Điện thoại và PC cùng Wi-Fi. Android quét QR trong Expo Go; iPhone dùng Camera mở QR bằng Expo Go. Nếu được yêu cầu đăng nhập Expo, dùng cùng tài khoản Expo với CLI. Tài khoản Expo và tài khoản AutoCare là hai tài khoản riêng.

App mặc định lấy IP máy chạy Expo và gọi API cổng 3000. Nếu cần ghi đè, sao chép `mobile/.env.example` thành `mobile/.env`, đặt `EXPO_PUBLIC_API_URL=http://IP_CUA_PC:3000`, rồi khởi động lại Expo. Máy ảo Android có thể dùng `http://10.0.2.2:3000`. Cho phép Node.js qua Windows Firewall trên mạng riêng nếu điện thoại không gọi được API.

## Web admin

Mở terminal thứ ba:

```powershell
cd D:\car-maintenance-app\admin-web
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Mở **http://localhost:3001**. `.env.local` mặc định gọi backend tại `http://127.0.0.1:3000`.

Để tạo admin đầu tiên trên database mới, thêm `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` vào **backend/.env** theo mẫu trong `.env.example`. Chọn email riêng, mật khẩu ít nhất 8 ký tự, rồi chạy trong terminal khác:

```powershell
cd D:\car-maintenance-app\backend
npm run admin:create
```

Sau khi tạo xong, xóa dòng `ADMIN_PASSWORD` khỏi `.env`. Script không tạo thêm admin nếu đã có admin hoạt động. Repo không có mật khẩu mặc định.

## Chuyển cả dữ liệu từ laptop

GitHub chỉ chuyển code, không chuyển database, tài khoản, xe, lịch sử hoặc hộp thư thử. Nếu cần giữ toàn bộ dữ liệu hiện có, dùng pgAdmin **Backup** database `car_maintenance_personal` trên laptop, chuyển file riêng sang PC rồi **Restore** vào database tương ứng trước khi chạy backend. Khi dùng JWT_SECRET mới, cần đăng nhập lại.

Không đưa bản sao database lên GitHub vì có dữ liệu cá nhân. `.env`, database export, node_modules, output build, ảnh/log kiểm thử và `.local-backups/` bị Git bỏ qua. Chỉ `.env.example` làm mẫu được đưa lên repo. `.gitignore` không mã hóa dữ liệu và không xóa bí mật khỏi lịch sử Git.
