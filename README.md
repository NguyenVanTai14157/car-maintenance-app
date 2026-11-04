# AutoCare — quản lý lịch bảo dưỡng ô tô

> Bản lưu trữ **bốn vai trò**, trước khi chuyển sang nghiệp vụ một vai trò theo yêu cầu mentor. Xem [hướng dẫn lưu GitHub và khôi phục](docs/GITHUB-SETUP.md).

React Native + Expo Router (SDK 58), NestJS, PostgreSQL 17. Bốn vai trò dùng chung app: khách hàng, tiếp nhận, kỹ thuật viên, quản trị viên.

## Chạy trong terminal Antigravity

Mở hai terminal riêng và giữ cả hai chạy:

```powershell
cd D:\car-maintenance-app\backend
npm run dev
```

```powershell
cd D:\car-maintenance-app\mobile
npm start -- --lan
```

Điện thoại và laptop cùng Wi-Fi: mở Expo Go quét QR. Máy ảo Android đang mở: chọn terminal Expo rồi bấm `a`. Lưu file sẽ Fast Refresh; `r` dùng khi muốn tải lại toàn bộ. Nếu cổng đang có server chạy, dùng terminal đó thay vì mở thêm server trùng.

Trong Antigravity cũng có Terminal → Run Task → **AutoCare: Backend** / **AutoCare: Mobile (QR Expo)**. Backend tự khởi động lại khi sửa mã.

App tự lấy hostname của Expo để kết nối API cổng 3000. Chỉ đặt `EXPO_PUBLIC_API_URL` trong `mobile/.env` khi cần ghi đè; thay `.env` thì khởi động lại Expo. Máy ảo có thể dùng `http://10.0.2.2:3000`. Backend cần truy cập được từ mạng nội bộ để điện thoại gọi API.

## Database và tài khoản

`backend/.env` chứa `DATABASE_URL`, `JWT_SECRET`, `DEMO_PASSWORD` (không commit). Backend áp dụng migration bổ sung khi khởi động, giữ dữ liệu tài khoản đã có. Database phải tồn tại trước: `car_maintenance`.

Chạy `npm run seed` trong backend để tạo tài khoản mẫu, gara và dịch vụ nếu chưa có. Thông tin đăng nhập trên máy này nằm trong [.demo-accounts.md](.demo-accounts.md). Đăng ký thông thường luôn tạo khách hàng; chỉ admin được cấp vai trò nhân viên.

## Cấu trúc đang sử dụng

- `mobile/src/app/`: màn hình Expo Router.
- `mobile/src/components/`: giao diện và biểu mẫu dùng chung.
- `mobile/src/hooks/`: phiên đăng nhập, tải dữ liệu.
- `mobile/src/services/`: API, lưu token, nhắc lịch.
- `backend/src/`: auth, danh mục, lịch hẹn, báo cáo.
- `backend/migrations/`: schema PostgreSQL có phiên bản.
- `backend/tests/`: kiểm thử API và nghiệp vụ.
- `mobile/tests/`: kiểm thử giao diện web dùng chung mã React Native.
- `docs/`: đối chiếu BA, báo cáo và ảnh kiểm thử.

Entry mobile là `expo-router/entry`; `mobile/App.tsx` và `mobile/index.ts` là mã cũ, không được chạy. Chỉnh màn hình trong `mobile/src/app/`.

## Kiểm thử

Backend đang chạy cổng 3000:

```powershell
cd D:\car-maintenance-app\backend
npm test
npx tsc --noEmit
```

```powershell
cd D:\car-maintenance-app\mobile
npm run lint
npm run typecheck
npm run web -- --port 8083
```

Trong terminal mobile khác chạy `node tests/ui.cjs`. Cần Microsoft Edge, dữ liệu seed và `DEMO_PASSWORD` khớp tài khoản mẫu. Bài kiểm thử tạo và dọn dữ liệu thử của riêng chúng; chỉ chạy với database phát triển.

Xem [phạm vi BA](docs/BA-IMPLEMENTATION.md) và [báo cáo kiểm thử](docs/TEST-REPORT.md). Đây là bản phát triển cục bộ; thanh toán ghi nhận thủ công, thông báo trong app và nhắc lịch cục bộ, chưa kết nối cổng thanh toán hay push từ xa.

## Kiến trúc backend đã chuẩn hóa

Backend hiện chia feature module tại `backend/src/modules/`: auth, users, vehicles, garages, services, appointments, notifications, reports. Mỗi module có controller, service và repository; các module nhận body có input DTO. Guard/filter/validation/types nằm trong common, kết nối PostgreSQL trong database, seed trong scripts.

Xem [BACKEND-ARCHITECTURE.md](docs/BACKEND-ARCHITECTURE.md) để biết trách nhiệm từng tầng và quy ước thêm chức năng. Lệnh bổ sung: `npm run build`, `npm run start:prod`, `npm run format:check` trong backend.

## Cập nhật trực tiếp

App đã dùng Socket.IO và PostgreSQL LISTEN/NOTIFY để cập nhật sau khi ghi thành công. Không còn polling 15 giây làm cơ chế chính; tải lại 30 giây chỉ dùng khi mất socket. Xem [REALTIME.md](docs/REALTIME.md) để chạy và kiểm thử nhiều thiết bị. Realtime khi app mở không thay thế push notification khi app đóng.
