# Kiến trúc backend

Backend dùng feature modules của NestJS. Điểm ghép ứng dụng là `src/app.module.ts`.

```text
src/
  main.ts                 Nạp môi trường và khởi động
  bootstrap.ts            HTTP/CORS, filter, migration, shutdown hooks
  app.module.ts           Đăng ký các module
  health.controller.ts    Kiểm tra server
  common/
    guards/auth.guard.ts  Xác minh token, phiên và tài khoản hoạt động
    filters/              Chuẩn hóa lỗi HTTP và PostgreSQL
    types/                Request có user/session và kiểu role
    validation/           Kiểm tra dữ liệu dùng chung
  database/
    connection.ts         Pool, migration, transaction
    database.service.ts   Provider truy vấn và đóng pool khi shutdown
    database.module.ts    Cung cấp DatabaseService
  modules/
    auth/
    users/
    vehicles/
    garages/
    services/
    appointments/
    notifications/
    reports/
  scripts/seed.ts         Dữ liệu khởi tạo
```

Mỗi feature có `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`. Các feature nhận body có `dto/input.dto.ts`.

- Controller nhận HTTP và gọi service, không xử lý SQL.
- Service giữ quy tắc nghiệp vụ, kiểm tra quyền, dữ liệu đầu vào và ranh giới transaction.
- Repository giữ SQL tham số hóa; có thể dùng client transaction do service truyền xuống.
- DTO hiện là TypeScript interface mô tả đầu vào. Kiểm tra dữ liệu lúc chạy vẫn nằm trong service và common/validation; không có ValidationPipe tự động từ interface.
- AuthGuard đăng ký qua APP_GUARD trong AuthModule; quyền nghiệp vụ tiếp tục được kiểm tra trong service.
- NotificationsModule quản lý bộ quét nhắc lịch qua lifecycle hooks, sử dụng AppointmentsService; timer dọn khi server đóng.
- AppointmentsService giữ việc chuyển trạng thái và kiểm tra chỗ trống trong cùng transaction. Không tách chúng thành các thao tác DB rời rạc.

## Quy ước phát triển

Thêm endpoint tại controller, kiểu đầu vào tại dto, quy tắc tại service, SQL tại repository. Đăng ký provider trong module. Chỉ export provider khi module khác cần. Mật khẩu/token không đưa vào log.

Lệnh trong thư mục backend:

- `npm run dev`: chạy có theo dõi thay đổi.
- `npm run typecheck`: kiểm tra TypeScript.
- `npm run build`: tạo dist.
- `npm run start:prod`: chạy bản build; phải có .env và migrations ngoài dist.
- `npm test`: kiểm thử API với server chạy sẵn, mặc định cổng 3000; TEST_API_URL dùng để đổi cổng.
- `npm run format` / `npm run format:check`: chuẩn hóa/kiểm tra định dạng.
- `npm run seed`: tạo dữ liệu cơ bản nếu chưa có.

Cấu trúc này theo [feature modules của NestJS](https://docs.nestjs.com/modules) và dùng [lifecycle hooks](https://docs.nestjs.com/fundamentals/lifecycle-events) để quản lý tài nguyên. Đây là chuẩn hóa kiến trúc, không phải chứng nhận đã sẵn sàng triển khai production.
