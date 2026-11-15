# Backend cho web admin

## Trạng thái và phạm vi

Backend admin được đặt tại `backend/src/modules/admin/`. Giao diện Next.js ở thư mục gốc `admin-web/`, ngang cấp với `backend/` và `mobile/`. Gói cập nhật tạm đã chuyển vào bản sao local, không còn thư mục backend-updates ở gốc dự án.

App cá nhân vẫn có role `user`. Role `admin` đăng nhập web qua endpoint riêng. Web Next.js trong admin-web/ đã triển khai, gọi cùng Nest API qua lớp API cùng nguồn. Phiên admin được giữ bằng cookie HttpOnly; token không trả về JavaScript của trình duyệt.

## Quy tắc

- Đăng ký công khai luôn tạo `user`, không nhận quyền admin từ body.
- Login người dùng và login admin tách biệt. JWT không được dùng như bằng chứng role duy nhất; mỗi request đọc lại user/session từ DB. Quyền admin được kiểm tra bằng metadata trên controller, kể cả URL đổi chữ hoa/thường.
- Admin thêm/sửa người dùng, phân quyền, khóa/mở khóa; không xem hash/mật khẩu và không trực tiếp đặt lại mật khẩu người dùng qua API sửa hồ sơ.
- Đổi role, khóa/mở khóa hoặc đổi email qua admin thu hồi các phiên/mã khôi phục cũ của người bị thay đổi. Người dùng phải đăng nhập lại.
- Không tự khóa, tự hạ quyền hoặc tự xóa tài khoản đang quản trị. Giữ ít nhất một admin hoạt động. Các mutation admin kiểm tra lại quyền trong transaction và được tuần tự hóa để chặn hạ quyền chéo đồng thời.
- Chỉ xóa tài khoản chưa có xe/kế hoạch/lịch sử. Có dữ liệu thì khóa; không xóa dây chuyền lịch sử/chi phí cá nhân.
- Admin xem xe, chủ sở hữu và lịch sử để hỗ trợ. Không có API admin sửa/xóa xe hoặc lịch sử của người dùng.
- Admin quản lý banner trang chủ: tải ảnh JPEG/PNG tối đa 2 MB, cập nhật nội dung, thứ tự, màn hình đích và trạng thái hiển thị. Thay đổi banner được ghi vào nhật ký quản trị.
- Danh mục hãng, dòng và loại xe do quản trị viên quản lý; không cần có dữ liệu mẫu ban đầu. Migration dọn các mục ví dụ chưa được xe người dùng sử dụng và giữ lại các mục đang được tham chiếu. Danh mục đã dùng phải ngừng sử dụng thay vì xóa. Dòng đã dùng không được đổi hãng/loại xe.
- Mỗi thay đổi quản trị ghi nhật ký trong cùng transaction; không ghi mật khẩu, token hoặc thông tin kết nối DB vào nhật ký. Nhật ký chỉ đọc qua API.

## Đăng nhập và phiên

`POST /admin/auth/login`

```json
{"identifier":"your-admin@example.com","password":"your-own-password"}
```

Trả `{user, accessToken}` như login mobile. Các API quản trị gửi `Authorization: Bearer <accessToken>`. Dùng chung `/auth/me`, `/auth/password`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password` cho tài khoản admin. Nest nhận Bearer token từ lớp API Next.js. Web hiện dùng cookie HttpOnly/SameSite=Lax, kiểm tra Origin cho mutation và không trả token về JavaScript; JWT secret chỉ nằm ở backend.

## API người dùng

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| GET | /admin/users | Danh sách phân trang/tìm kiếm |
| GET | /admin/users/:id | Hồ sơ an toàn và số xe/kế hoạch/bản ghi |
| POST | /admin/users | Tạo tài khoản user/admin |
| PATCH | /admin/users/:id | Cập nhật trường được phép, khóa/mở khóa, role |
| DELETE | /admin/users/:id | Xóa tài khoản chưa có dữ liệu |

POST: `name`, `email`, `password` bắt buộc; `phone` tùy chọn; `role` mặc định user; `active` mặc định true. Password tối thiểu 8 ký tự và được băm bcrypt.

PATCH một hoặc nhiều trường `name`, `email`, `phone`, `role`, `active`; không nhận password hoặc trường lạ. Khóa: `{"active":false}`; mở khóa: `{"active":true}`.

Query danh sách: `page` mặc định 1, `page_size` mặc định 20, giới hạn 100; `q` tìm tên/email/SĐT; `active=true|false`, `role=user|admin`. Tìm kiếm dùng tham số SQL và escape wildcard. Response danh sách dùng `{items,total,page,page_size}`. Các query lọc có thể kết hợp.

## API xe và thống kê

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| GET | /admin/dashboard | Số tài khoản, xe và trạng thái lịch bảo dưỡng; hãng phổ biến từ xe đã đăng ký |
| GET | /admin/vehicles | Danh sách xe kèm tên/email chủ sở hữu |
| GET | /admin/vehicles/:id | Chi tiết xe, ảnh/ghi chú nếu có |
| GET | /admin/vehicles/:id/plans | Lịch bảo dưỡng và trạng thái tính theo ngày/km, chỉ đọc |
| GET | /admin/vehicles/:id/records | Lịch sử thực tế của xe, phân trang, chỉ đọc |
| GET | /admin/audit-logs | Nhật ký quản trị, phân trang |
| GET | /admin/banners | Danh sách banner trang chủ |
| POST | /admin/banners | Tạo banner và tải ảnh lên |
| PATCH | /admin/banners/:id | Cập nhật nội dung, ảnh, thứ tự hoặc trạng thái |
| DELETE | /admin/banners/:id | Xóa banner và ảnh đã tải |

App đọc banner đang bật từ `GET /banners`; PostgreSQL phát tín hiệu realtime để các ứng dụng đang mở tải lại danh sách. Ảnh được lưu trên ổ đĩa backend và phục vụ tại `/uploads/banners/:filename`. Khi triển khai production, cấu hình `BANNER_UPLOAD_DIR` trỏ đến ổ lưu trữ bền vững và đưa thư mục đó vào quy trình sao lưu; database chỉ lưu đường dẫn ảnh, không lưu dữ liệu ảnh.

Xe lọc `owner_id`, `brand_id`, `model_id`, `type_id`, `archived=true|false`, `q` tìm biển/hãng/dòng/tên/email chủ xe. Danh sách xe không tải ảnh base64; chỉ tải ở chi tiết. Nhật ký lọc `actor_id`, `action`, `entity`. Admin không truy cập chức năng cá nhân `/vehicles`, `/plans`, `/records`, `/backup` như user thông thường.

## Dữ liệu cũ và backup

Hãng và dòng xe trong màn quản trị được lấy trực tiếp từ thông tin người dùng nhập trên xe. Các bảng tham chiếu cũ vẫn được giữ để bảo toàn liên kết của xe và file sao lưu từ những phiên bản trước; web admin không còn màn hình quản lý các danh mục này. Migration xóa các mục ví dụ chưa được xe nào tham chiếu, không xóa xe hay dữ liệu cá nhân.

Backup cá nhân giữ các liên kết tham chiếu cũ khi khôi phục trên cùng hệ thống; file không có ID tham chiếu vẫn khôi phục xe bằng tên hãng/dòng dạng text. Kiểm tra tham chiếu diễn ra trước khi thay dữ liệu, có rollback nếu lỗi.

Migration có version và checksum trong `schema_migrations`, chạy một lần trong transaction/lock. Không sửa migration đã áp dụng; tạo migration mới. Danh mục không còn được quản lý từ web admin và không tự nạp dữ liệu ví dụ khi khởi động.

## Mã lỗi

401: chưa đăng nhập/sai loại tài khoản/phiên đã thu hồi. 403: thiếu quyền admin hoặc admin gọi chức năng chỉ dành cho user. 400: dữ liệu/ràng buộc nghiệp vụ không hợp lệ. 404: ID không tồn tại. 409: email/SĐT/tên danh mục trùng. POST thành công dùng 201 theo mặc định Nest; GET/PATCH/DELETE dùng 200.

## Tạo admin đầu tiên

Sau khi cấu hình database cá nhân, đặt `ADMIN_EMAIL`, `ADMIN_PASSWORD`, tùy chọn `ADMIN_NAME` trong môi trường local rồi chạy `npm run admin:create` tại backend. Không có mật khẩu mặc định, không nhận admin qua đăng ký công khai. Script từ chối nếu đã có admin đang hoạt động hoặc email trùng một user hiện hữu. Không ghi thông tin đăng nhập ra console và không commit env.
