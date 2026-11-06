# Kiểm thử backend admin — 05/11/2026

## Trạng thái hiện tại

Backend admin đã được ghép vào backend chính sau khi kiểm tra không có xung đột. Gói tạm đã chuyển vào .local-backups; dự án dùng admin-web / backend / mobile ngang cấp. Phần kết quả bên dưới ghi lại lượt kiểm thử độc lập trước khi ghép.

## Môi trường kiểm thử trước khi ghép

Mã tích hợp được kiểm thử tại `.local-backups/admin-backend`, cổng **3002**, database **car_maintenance_personal_admin_test**. Không áp dụng migration/sửa nguồn vào backend mà Anti đang test. Bản thay đổi để ghép sau QA nằm ở `backend-updates/admin/files/` với manifest hash chống ghi đè xung đột.

Chỉ kiểm thử backend/API, chưa có giao diện Next.js. Không dùng tài khoản hay dữ liệu thật; tài khoản thử được tạo và dọn sau từng bộ kiểm thử.

| Kiểm tra | Kết quả |
| --- | --- |
| npm run build | PASS TypeScript/Nest production build |
| npm run format:check | PASS |
| npm test, TEST_API_URL=http://127.0.0.1:3002 | PASS 121 lượt hồi quy cá nhân |
| npm run test:admin | PASS 107 lượt API/bảo mật/danh mục |
| npm run test:admin:migration | PASS nâng cấp trên database tạm, đã dọn database đó |
| node backend-updates/admin/test-apply.cjs | PASS kiểm tra bộ ghép trên file giả |
| node backend-updates/admin/apply.cjs | CHECK OK, 27 file chờ ghép; không ghi backend đang chạy |

## Phạm vi admin đã kiểm thử

- Tạo admin đầu tiên bằng CLI; từ chối bootstrap lần nữa khi đã có admin hoạt động. Đăng ký công khai không tự cấp quyền dù request gửi role admin.
- Login user/admin tách biệt. User, request chưa đăng nhập và URL admin đổi chữ hoa/thường không vượt guard. Admin không dùng API nghiệp vụ cá nhân như user.
- Danh sách người dùng phân trang, tìm kiếm, lọc. Query sai/ID sai bị chặn, tìm kiếm không mở SQL injection. Response không chứa password_hash.
- Thêm/sửa user, trùng email, mật khẩu ngắn, trường lạ, body rỗng, boolean sai. Xóa tài khoản trống, chặn xóa tài khoản có xe. Không tự khóa/hạ quyền/xóa chính admin đang quản trị.
- Khóa user thu hồi token cũ và ngắt socket; mở khóa không làm token cũ sống lại, phải đăng nhập mới.
- CRUD hãng/dòng/loại; tên trùng, hãng không tồn tại, dòng thiếu hãng. Public catalog chỉ trả mục được sử dụng, không thể lách bằng active=false.
- Xe mới chọn ID hãng/dòng/loại có tên đúng và loại mặc định đúng; hãng/model không khớp bị chặn. Xe text cũ vẫn tạo/sửa bình thường.
- Danh mục đã dùng không xóa được; dòng đã dùng không đổi hãng/loại được. Ngừng hãng ẩn model khỏi danh sách chọn và chặn chọn mới; xe cũ vẫn cập nhật km được.
- Admin xem xe theo chủ sở hữu, hãng, loại, ảnh/ghi chú ở chi tiết, lịch sử chỉ đọc. Không có API admin sửa xe/lịch sử người dùng.
- Restore backup giữ liên kết catalog. Hồi quy toàn bộ luồng cá nhân vẫn đạt.
- Thống kê tổng quan/hãng phổ biến và nhật ký mutation. Nhật ký không chứa mật khẩu/token/hash.
- Đổi tên model vẫn tìm được xe theo tên danh mục hiện tại; API giữ snapshot text gốc và trả thêm catalog_brand_name/catalog_model_name.
- Socket admin/user nhận sự kiện thay đổi catalog đúng tài nguyên. Sự kiện chỉ yêu cầu đọc lại API, không phát dữ liệu riêng tư trực tiếp.
- Hai admin hạ quyền chéo đồng thời: chỉ một request thành công, hệ thống còn một admin hoạt động. Request chờ phải kiểm tra lại quyền trước mutation.

## Migration và đóng gói

Database tạm bắt đầu từ schema personal 001, có user/xe/phiên và ghi chú. Nâng cấp giữ nguyên ID, text, km, ghi chú, phiên và hạng mục cá nhân. Toyota/Vios khớp được nối với catalog; hãng/dòng tự nhập không khớp vẫn giữ nguyên. Chạy migration lại không seed lại hãng Toyota đã đổi tên, số version được ghi nhận đúng.

Bộ ghép mặc định chỉ kiểm tra. Test trên file giả xác nhận: không ghi khi check, sao lưu bản gốc trước apply, apply lần hai không thay đổi thêm, và phát hiện file QA sửa rồi từ chối ghi đè. Bộ ghép chưa được chạy --apply trên backend thật.

## Chưa xác nhận

Chưa test Next.js UI vì chưa xây web. Chưa test chọn danh mục trên mobile vì app hiện tại còn nhập text. Chưa gửi SMTP thật, chưa kiểm thử production/HTTPS/tải lớn. Database/máy ảo Anti đang sử dụng vẫn phục vụ bộ test cũ cho đến khi ghép thay đổi sau QA.
