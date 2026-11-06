# AutoCare Admin Web

Web quản trị **Next.js 16 + TypeScript + Ant Design 6**, ngang cấp `backend/` và `mobile/`. Dữ liệu thật từ NestJS/PostgreSQL, không có số liệu dashboard giả.

## Chạy và xem

Phiên xem thử trên máy hiện tại: **http://localhost:3001**. Web đã build và đang chạy. Tài khoản admin local nằm trong `.local-backups/admin-web-access.md` ở thư mục gốc; file này bị Git bỏ qua. Không có mật khẩu mặc định trong mã nguồn.

Web và app dùng chung backend mới ở cổng **3000**, database cá nhân hiện có. Backend đã được khởi động lại để nạp API admin và ba sửa lỗi QA; Expo và máy ảo được giữ nguyên. Web chạy ở cổng **3001**.

Tự chạy sau này:

```powershell
cd D:\car-maintenance-app\admin-web
npm ci
npm run dev
```

Backend cũng phải chạy. Sao chép `.env.example` thành `.env.local` nếu chưa có và đặt `ADMIN_API_URL` đúng cổng Nest đang dùng (thông thường `http://127.0.0.1:3000`). Đổi env thì khởi động lại Next. Nếu cổng 3001 đang có bản xem thử, mở URL hiện có thay vì chạy trùng server.

Trong VS Code/Antigravity: Terminal → Run Task → **AutoCare: Admin Web (Next.js)**. Source màn hình ở `src/app/(admin)/`, thành phần dùng chung ở `src/components/`.

## Chức năng

- Đăng nhập/đăng xuất admin, quên/đặt lại mật khẩu qua hộp thư preview hoặc SMTP đã cấu hình ở Nest.
- Tổng quan số người dùng, xe, hãng/dòng/loại xe và phân bố thực tế.
- Người dùng: tìm kiếm, lọc, phân trang, thêm/sửa, xem chi tiết, khóa/mở khóa và xóa tài khoản chưa có dữ liệu.
- Xe: tìm theo biển/hãng/dòng/chủ sở hữu, lọc chủ sở hữu/trạng thái, chi tiết ảnh/ghi chú và lịch sử bảo dưỡng chỉ đọc.
- Danh mục: CRUD hãng/dòng/loại, liên kết hãng–dòng–loại và ngừng sử dụng khi đã có tham chiếu.
- Nhật ký quản trị: lọc thao tác/đối tượng, xem chi tiết thay đổi.
- Tài khoản cá nhân và đổi mật khẩu. Menu bên trái thu gọn thành drawer trên màn hình nhỏ.

## Kiến trúc phiên đăng nhập

Browser gọi API cùng nguồn của Next (`src/app/api/`); Next chuyển tiếp các endpoint được cho phép sang Nest. Token chỉ được giữ trong cookie HttpOnly/SameSite=Lax, không lưu localStorage và không trả accessToken trong response đăng nhập web. POST/PATCH/DELETE kiểm tra Origin. Nest vẫn xác thực session/role trên từng request. Trang quản trị kiểm tra quyền ở server layout; trình duyệt bị đưa về login khi phiên hết hạn.

`ADMIN_API_URL` chỉ ở server, không dùng NEXT_PUBLIC. Khi triển khai HTTPS, cấu hình `ADMIN_COOKIE_SECURE=true`; không đưa JWT_SECRET, DATABASE_URL hoặc thông tin SMTP vào web. Cookie local được đặt không Secure để dùng HTTP trên laptop.

## Kiểm thử

```powershell
npm run typecheck
npm run lint
npm run build
npm run test:ui
```

UI test cần backend dependencies đã cài, Microsoft Edge và file truy cập admin local nói trên. Mặc định gọi web 3001/API 3000. Có thể ghi đè TEST_WEB_URL/TEST_API_URL nhưng phải cùng database trong backend/.env. Test tạo tài khoản riêng có dấu thời gian; chỉ dọn các ID/prefix do chính lượt test tạo, không reset DB.

Đã kiểm thử 18 luồng thực tế và kiểm tra ảnh ở `docs/test-results/admin-web/`. Chi tiết tại [báo cáo web admin](../docs/ADMIN-WEB-TEST-REPORT.md), hợp đồng Nest tại [API admin](../docs/ADMIN-BACKEND.md).
