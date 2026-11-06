# Backend cho web admin

## Trạng thái và phạm vi

Backend admin đã được ghép vào `backend/src/modules/admin/` và `backend/src/modules/catalog/`. Giao diện Next.js ở thư mục gốc `admin-web/`, ngang cấp với `backend/` và `mobile/`. Gói cập nhật tạm đã chuyển vào bản sao local, không còn thư mục backend-updates ở gốc dự án.

App cá nhân vẫn có role `user`. Role `admin` đăng nhập web qua endpoint riêng. Web Next.js trong admin-web/ đã triển khai, gọi cùng Nest API qua lớp API cùng nguồn. Phiên admin được giữ bằng cookie HttpOnly; token không trả về JavaScript của trình duyệt.

## Quy tắc

- Đăng ký công khai luôn tạo `user`, không nhận quyền admin từ body.
- Login người dùng và login admin tách biệt. JWT không được dùng như bằng chứng role duy nhất; mỗi request đọc lại user/session từ DB. Quyền admin được kiểm tra bằng metadata trên controller, kể cả URL đổi chữ hoa/thường.
- Admin thêm/sửa người dùng, phân quyền, khóa/mở khóa; không xem hash/mật khẩu và không trực tiếp đặt lại mật khẩu người dùng qua API sửa hồ sơ.
- Đổi role, khóa/mở khóa hoặc đổi email qua admin thu hồi các phiên/mã khôi phục cũ của người bị thay đổi. Người dùng phải đăng nhập lại.
- Không tự khóa, tự hạ quyền hoặc tự xóa tài khoản đang quản trị. Giữ ít nhất một admin hoạt động. Các mutation admin kiểm tra lại quyền trong transaction và được tuần tự hóa để chặn hạ quyền chéo đồng thời.
- Chỉ xóa tài khoản chưa có xe/kế hoạch/lịch sử. Có dữ liệu thì khóa; không xóa dây chuyền lịch sử/chi phí cá nhân.
- Admin xem xe, chủ sở hữu và lịch sử để hỗ trợ. Không có API admin sửa/xóa xe hoặc lịch sử của người dùng.
- Hãng xe: Honda/Toyota; dòng xe: City/Vios thuộc hãng; loại xe: Sedan/SUV/Bán tải. Danh mục đã dùng phải ngừng sử dụng thay vì xóa. Dòng đã dùng không được đổi hãng/loại xe.
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
| GET | /admin/dashboard | Số user/admin hoạt động, xe, danh mục, hãng phổ biến |
| GET | /admin/vehicles | Danh sách xe kèm tên/email chủ sở hữu |
| GET | /admin/vehicles/:id | Chi tiết xe, ảnh/ghi chú nếu có |
| GET | /admin/vehicles/:id/records | Lịch sử thực tế của xe, phân trang, chỉ đọc |
| GET | /admin/audit-logs | Nhật ký quản trị, phân trang |

Xe lọc `owner_id`, `brand_id`, `model_id`, `type_id`, `archived=true|false`, `q` tìm biển/hãng/dòng/tên/email chủ xe. Danh sách xe không tải ảnh base64; chỉ tải ở chi tiết. Nhật ký lọc `actor_id`, `action`, `entity`. Admin không truy cập chức năng cá nhân `/vehicles`, `/plans`, `/records`, `/backup` như user thông thường.

## API danh mục

`kind` chỉ nhận `brands`, `models`, `types`.

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| GET | /admin/catalog/:kind | Xem cả hoạt động/ngừng sử dụng |
| POST | /admin/catalog/:kind | Thêm |
| PATCH | /admin/catalog/:kind/:id | Sửa tên/trạng thái/tham chiếu được phép |
| DELETE | /admin/catalog/:kind/:id | Xóa nếu chưa có tham chiếu |
| GET | /catalog/:kind | User/admin đọc danh mục đang dùng để chọn xe |

Hãng/loại: `{name,active?}`. Dòng xe: `{name,brand_id,type_id?,active?}`. PATCH nhận một phần các trường đó. Tên hãng/loại không trùng không phân biệt hoa/thường; tên dòng không trùng trong cùng hãng. Model thuộc hãng/loại ngừng sử dụng sẽ không hiện ở API chọn xe. Query model có `brand_id`, `type_id`; các danh sách có `q`, `page`, `page_size`, admin có thêm `active`.

Ví dụ tạo xe từ danh mục, dùng API cá nhân hiện có:

```json
{"brand_id":1,"model_id":1,"odometer":35000,"plate":"51A-123.45"}
```

Server lấy tên hãng/dòng từ danh mục, kiểm tra quan hệ và trạng thái, suy ra loại xe mặc định của model. Chọn sai hãng/model/type bị chặn. `brand` và `model` dạng text vẫn được chấp nhận để tương thích app hiện tại; không tạo danh mục toàn cục từ text người dùng nhập. Sau khi mobile có bộ chọn danh mục, ưu tiên gửi các ID chuẩn. Xe đã dùng danh mục ngừng hoạt động vẫn sửa thông tin khác được mà không buộc mất liên kết cũ.

## Dữ liệu cũ và backup

Migration chỉ bổ sung bảng/cột, không xóa dữ liệu cá nhân và phiên cũ. Liên kết xe cũ chỉ khi tên hãng/dòng khớp chính xác sau trim và bỏ phân biệt hoa/thường; trường text gốc giữ nguyên. Xe không khớp vẫn hiện trong danh sách admin và tìm được bằng q; không đoán dòng/loại xe.

Backup cá nhân giữ các liên kết catalog của xe khi khôi phục trên cùng hệ thống; file cũ không có ID catalog vẫn khôi phục được thành xe text. Kiểm tra tham chiếu diễn ra trước khi thay dữ liệu, có rollback nếu lỗi.

Migration có version và checksum trong `schema_migrations`, chạy một lần trong transaction/lock. Không sửa migration đã áp dụng; tạo migration mới. Danh mục khởi tạo không tự xuất hiện lại sau khi admin đã đổi tên/xóa ở các lần khởi động sau.

## Mã lỗi

401: chưa đăng nhập/sai loại tài khoản/phiên đã thu hồi. 403: thiếu quyền admin hoặc admin gọi chức năng chỉ dành cho user. 400: dữ liệu/ràng buộc nghiệp vụ không hợp lệ. 404: ID không tồn tại. 409: email/SĐT/tên danh mục trùng. POST thành công dùng 201 theo mặc định Nest; GET/PATCH/DELETE dùng 200.

## Tạo admin đầu tiên

Sau khi cấu hình database cá nhân, đặt `ADMIN_EMAIL`, `ADMIN_PASSWORD`, tùy chọn `ADMIN_NAME` trong môi trường local rồi chạy `npm run admin:create` tại backend. Không có mật khẩu mặc định, không nhận admin qua đăng ký công khai. Script từ chối nếu đã có admin đang hoạt động hoặc email trùng một user hiện hữu. Không ghi thông tin đăng nhập ra console và không commit env.
