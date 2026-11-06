# Đặc tả nghiệp vụ cá nhân

Một role user, mỗi tài khoản có nhiều xe. Không còn gara, tiếp nhận, kỹ thuật viên, duyệt lịch, thanh toán hoặc checklist công việc.

## Tài khoản

Email bắt buộc, duy nhất và chuẩn hóa chữ thường. SĐT tùy chọn. Mật khẩu từ 8 ký tự, băm bcrypt; phiên có hạn 7 ngày, token native lưu SecureStore. Quên mật khẩu phản hồi chung cho email có/không tồn tại, chống dò theo IP và khoảng cách gửi lại, mã ngẫu nhiên một lần 15 phút chỉ lưu SHA-256. Đặt lại thành công thu hồi mọi phiên. Email chưa có xác minh sở hữu ở bản phát triển.

## Xe, hạng mục

Hãng, dòng, km không âm bắt buộc; biển số/năm/ảnh/ghi chú tùy chọn. Biển số không trùng trong cùng tài khoản. Km hiện tại chỉ tăng; lịch sử cũ được nhập km thấp hơn nhưng phải đúng thứ tự ngày/km. Xóa xe chưa dùng; lưu trữ xe đã dùng, dừng nhắc và không thêm lịch/bản ghi mới. Lịch sử/chi phí vẫn giữ khi lưu trữ. Hạng mục đã dùng được ngừng sử dụng, không xóa mất tham chiếu.

## Kế hoạch

Có ngày hoặc km hoặc cả hai. Nhắc trước theo ngày/km cấu hình riêng; thay mặc định trong cài đặt không làm đổi lịch cũ. Cho phép nhập kế hoạch đã đến/quá hạn để ghi lại việc đang cần làm.

| Trạng thái | Quy tắc |
| --- | --- |
| Chưa đến hạn | Chưa đạt ngưỡng nhắc của ngày và km |
| Sắp đến hạn | Còn dương và đã trong ngưỡng nhắc của ít nhất một tiêu chí |
| Đến hạn | Ngày bằng hôm nay hoặc km bằng km hiện tại |
| Quá hạn | Hôm nay vượt ngày hoặc km hiện tại vượt ngưỡng |
| Hoàn thành | Có bản ghi liên kết được lưu thành công |
| Đã hủy | Chủ tài khoản hủy kế hoạch chưa hoàn thành |

Hoàn thành/hủy loại khỏi nhắc. Khi nhiều tiêu chí khác trạng thái, ưu tiên quá hạn > đến hạn > sắp đến hạn > chưa đến hạn. Hiển thị các tiêu chí đã đến/vượt ngưỡng; nếu chưa có thì hiển thị tiêu chí sắp đến. Ví dụ: ngày còn 20 ngày, km đạt 45.000 -> đến hạn theo km; ngày đã qua, km cũng vượt -> quá hạn theo ngày và km.

## Ghi nhận và lịch sử

Ngày thực hiện không ở tương lai; km/chi phí không âm; nội dung bắt buộc, ghi chú/ảnh tùy chọn. Tạo độc lập hoặc từ kế hoạch. Bản ghi liên kết phải khớp xe/hạng mục, mỗi kế hoạch một bản ghi, lịch đã hủy không được hoàn thành. Lưu bản ghi và tăng km hiện tại (nếu cao hơn) trong một transaction. Không bắt buộc ảnh ở bản cá nhân.

Sửa/xóa chỉ dữ liệu của mình. Sửa ngày/km phải không đảo thứ tự lịch sử. Xóa không giảm km hiện tại. Xóa bản ghi liên kết làm lịch mở lại theo ngày/km hiện tại. Bản ghi đã có lịch tiếp theo không đổi xe/hạng mục; sửa ngày/km/chi phí vẫn được, nhưng không tự sửa kế hoạch tiếp theo đã xác nhận.

Chu kỳ tháng/km tùy chọn. Đề xuất tính từ thực tế, tháng thiếu ngày cuối tháng được chặn về ngày cuối hợp lệ. Không tự tạo, một bản ghi chỉ xác nhận một lịch tiếp theo. Xóa bản ghi nguồn giữ lịch tiếp theo như một kế hoạch độc lập.

## Chi phí, backup, realtime

Tổng chi phí chỉ lấy bản ghi thực tế, bao gồm xe lưu trữ; sửa/xóa cập nhật tổng. Lọc theo xe, ngày, hạng mục; nhóm tháng/năm/hạng mục. Backup gồm xe, hạng mục, kế hoạch, lịch sử, ảnh, cài đặt; không gồm mật khẩu/token. Restore kiểm tra liên kết, trùng lặp, ngày/km, remap ID và transaction thay thế dữ liệu của tài khoản hiện tại; không đụng tài khoản khác.

Realtime báo thay đổi tới các phiên đang xác thực của cùng chủ dữ liệu. Client đọc lại API có guard; socket không phát dữ liệu cá nhân sang tài khoản khác. Mất kết nối dùng polling 30 giây và resync khi nối lại. Ngày được đánh giá lại khi mở/tải màn hình và khi sang ngày mới.

## Checklist BA

Đăng ký A/B -> thêm xe A -> thử B đọc/sửa dữ liệu A (phải bị chặn). Tạo kế hoạch theo ngày, km và cả hai -> kiểm tra lý do nhắc. Ghi nhận -> hoàn thành -> sửa chi phí -> kiểm tra tổng -> xóa -> lịch mở lại. Thử hủy rồi ghi nhận, hoàn thành hai lần, km giảm, ngày không tồn tại, bản ghi tương lai, km lịch sử đảo thứ tự. Xác nhận lịch chu kỳ hai lần (lần hai bị chặn). Lưu trữ xe -> dừng nhắc, giữ lịch sử. Export -> restore hợp lệ -> file sai phải giữ nguyên dữ liệu. Quên mật khẩu -> hết hạn/tái dùng phải lỗi -> đổi thành công thu hồi các phiên cũ. Kiểm tra thông báo/ảnh/chia sẻ file trên cả Android/iOS thật.
