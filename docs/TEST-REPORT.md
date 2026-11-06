# Kiểm thử bản cá nhân — 05/11/2026

Nhánh personal-maintenance. Backend riêng cổng 3001, PostgreSQL car_maintenance_personal; UI web Expo cổng 8083, Edge headless viewport 390×844. Tạo tài khoản thử riêng và dọn dữ liệu sau chạy; không dùng tài khoản gara hay database cũ.

| Kiểm tra | Kết quả |
| --- | --- |
| backend npm test | PASS 121 lượt API/rule/security |
| backend npm run build | PASS |
| backend npm run format:check | PASS |
| mobile npm run typecheck | PASS |
| mobile npm run lint | PASS, không lỗi/cảnh báo |
| mobile npm run test:ui | PASS 12 luồng, không lỗi runtime trình duyệt |
| mobile npm run test:notifications | PASS 5 nhánh helper kênh thông báo |
| expo export --platform all | PASS web, Android Hermes, iOS Hermes |

## Đã kiểm thử

- Đăng ký chỉ tạo role user dù request giả role admin; email bắt buộc, mật khẩu sai và API chưa đăng nhập bị chặn.
- Tài khoản A/B không đọc/sửa/xóa/liên kết dữ liệu của nhau. Realtime A nhận thay đổi xe A, B không nhận sự kiện đó.
- Hạng mục mặc định và CRUD; trùng tên; hạng mục đã dùng không được xóa, có thể ngừng sử dụng.
- Xe không có biển/năm được lưu; trùng biển trong cùng tài khoản bị chặn, khác tài khoản được phép. Km giảm không hợp lệ. Lưu trữ giữ chi phí/lịch sử và chặn lịch/bản ghi mới.
- Ngày không tồn tại, lịch không có cả ngày lẫn km, các trạng thái planned/soon/due/overdue/completed/cancelled. Hai ngưỡng có thể cùng xuất hiện trong lý do nhắc.
- Ghi nhận tương lai, chi phí âm, sai xe/hạng mục, km lịch sử đảo thứ tự bị chặn. Hai request hoàn thành một lịch đồng thời chỉ một thành công. Hoàn thành/hủy không được sửa như lịch đang theo dõi; lịch đã hủy không được hoàn thành.
- Bản ghi thực tế hoàn thành lịch; sửa chi phí cập nhật tổng; xóa mở lại lịch. Lịch sử cũ km thấp hơn hiện tại được chấp nhận nếu đúng thứ tự.
- Đề xuất chu kỳ từ thực tế, tháng nhuận/ngày cuối tháng; chỉ tạo khi xác nhận, chặn tạo trùng. Không đổi xe/hạng mục bản ghi đã có lịch tiếp theo.
- Nhắc không nhân đôi cùng sự kiện/ngày; tắt nhắc không sinh thông báo mới; thông báo ghi rõ ngày/km.
- Export không chứa mật khẩu; restore remap các ID và liên kết lịch tiếp theo, chỉ thay dữ liệu người hiện tại. File sai tham chiếu, ID trùng, phần tử null, lịch nguồn không khớp bị chặn trước khi xóa dữ liệu.
- Quên mật khẩu trả thông báo chung, mã không có trong response và database lưu hash. Preview tạo file đúng người nhận. Mã sai/hết hạn/tái dùng bị chặn. Hai request đặt lại đồng thời chỉ một thành công. Mật khẩu mới đăng nhập được, mật khẩu cũ/phiên cũ không còn hiệu lực.
- UI thao tác thật: đăng ký, khôi phục phiên khi reload, thêm xe, thêm lịch km, ghi nhận, tạo lịch kế tiếp, bộ lọc chi phí/lịch sử, sửa chi phí, tải/xuất và chọn/restore file, xóa lịch sử mở lại kế hoạch, đăng xuất, quên và đặt lại mật khẩu.

Ảnh giao diện kiểm tra bằng mắt: docs/test-results/personal-login.png, personal-plan.png, personal-home.png. File kết quả và ảnh thử được .gitignore bỏ qua.

## Phạm vi chưa xác nhận trên thiết bị thật

Bundle Android/iOS thành công không thay cho kiểm thử UI native. Chưa xác nhận trực tiếp camera/thư viện, quyền thông báo, giao thông báo khi khóa màn hình, trình chia sẻ file và khôi phục tài khoản trên iPhone thật trong lượt này. Cần BA kiểm thử trên Android/iOS của nhóm, đặc biệt quyền hệ thống và giới hạn pin. Bộ helper chỉ xác nhận xử lý lỗi kênh Expo Go đã gặp trước đây, không chứng minh OS sẽ giao mọi thông báo.

SMTP chưa được cung cấp nên chỉ kiểm thử hộp thư preview, chưa gửi Gmail thật. Chưa kiểm thử tải lớn, độ bền production, mất mạng/ghi ngoại tuyến hoặc phát hành App Store/Play Store. Lần export Hermes trong sandbox lỗi compiler; chạy lại ngoài sandbox đã xuất đủ web/Android/iOS thành công, không cần đổi mã ứng dụng.
