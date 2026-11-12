# Nhiều ảnh cho mỗi xe

## Sử dụng

- Trong form thêm/sửa xe, bấm Chọn ảnh xe để chọn một hoặc nhiều ảnh cùng lúc.
- Ảnh đã chọn hiển thị trong form. Thêm ảnh xe giữ các ảnh đã có; Bỏ ảnh chỉ thay đổi form, bấm Lưu xe mới lưu thay đổi.
- Không mở bước cắt ảnh. Chọn lại cùng một ảnh không làm tạo thêm bản sao giống hệt.
- Danh sách xe và chi tiết xe trên web admin hiển thị toàn bộ ảnh.
- Giữ giới hạn hiện tại của bộ ảnh: 10 ảnh, mỗi ảnh khoảng 2 MB. Kiểm tra ở cả app và API; thao tác chọn bị vô hiệu hóa khi đã đủ ảnh.

## Dữ liệu

Migration `004_vehicle_photos.sql` thêm cột `vehicles.images` dạng JSONB và đưa ảnh cũ vào vị trí đầu tiên. Không sửa migration đã chạy hoặc xóa ảnh cũ.

API nhận `images` làm danh sách ảnh chính; trường `image` cũ tiếp tục trả ảnh đầu tiên cho client cũ. Khi client cũ chỉ sửa thông tin xe hoặc đổi ảnh đầu, API giữ các ảnh còn lại. Client mới gửi `images: []` để bỏ toàn bộ ảnh.

Sao lưu/khôi phục giữ danh sách ảnh; bản sao cũ chỉ có trường `image` vẫn được khôi phục thành danh sách một ảnh. Không đổi tài khoản hoặc dữ liệu bảo dưỡng hiện có.

## Kiểm thử

- `node tests/vehicle-photos.cjs` trong backend: 20 kiểm tra API, migration từ dữ liệu ảnh cũ, quyền sở hữu, định dạng/số ảnh, tương thích client cũ và sao lưu/khôi phục. Migration thử được chạy trong schema tạm và rollback. API dùng tài khoản riêng rồi dọn dữ liệu do test tạo.
- `npm test` trong backend: 121 kiểm tra API/quy tắc/phân quyền, realtime và khôi phục mật khẩu.
- `npm run test:ui` trong mobile: 16 luồng, bổ sung chọn nhiều ảnh bằng trình chọn ảnh web, sửa/bỏ/thêm ảnh và kiểm tra ảnh trong bản sao lưu.
- Mobile và admin-web qua typecheck/lint; backend build thành công. Chưa thao tác thư viện ảnh trên iPhone thật trong lượt này.

Hai dòng hướng dẫn dưới năm sản xuất và số km hiện tại đã bỏ theo yêu cầu; các ví dụ trong ô nhập vẫn giữ.
