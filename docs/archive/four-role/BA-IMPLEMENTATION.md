# Đối chiếu triển khai BA

Nguồn: “Tài liệu không có tiêu đề.docx”. Đã đọc văn bản, bảng và bốn hình sơ đồ. Phạm vi bản phát triển ngày 03/11/2026:

| Vai trò | Chức năng đã triển khai |
|---|---|
| Khách hàng — 14 mục BA | Đăng ký bằng email/SĐT, đăng nhập/đăng xuất, hồ sơ và avatar; thêm/sửa xe (biển số, hãng, dòng, năm, km); xem dịch vụ/giá/thời lượng; chọn xe/gara/dịch vụ/ngày giờ đặt lịch; hủy/đổi lịch; nhắc lịch; danh sách/tiến độ/lịch sử/chi phí; đánh giá; thông báo |
| Tiếp nhận — 14 mục BA | Đăng nhập, tổng lịch hôm nay, tìm/lọc lịch; xác nhận/từ chối/đề xuất giờ; tiếp nhận tình trạng và km; xem khách/xe/dịch vụ; phân công kỹ thuật viên; tiến độ; chi phí phát sinh; ghi nhận thanh toán; bàn giao; gửi thông báo |
| Kỹ thuật viên — 11 mục BA | Đăng nhập; việc được giao và tổng hôm nay; danh sách/chi tiết; nhận việc/bắt đầu; checklist; tình trạng xe; ảnh trước/sau từ camera/thư viện; đề xuất phát sinh; hoàn thành; lịch sử |
| Admin — 15 mục BA | Đăng nhập; tổng quan; tạo/sửa/khóa tài khoản, phân quyền; tìm/khóa khách; tra cứu xe; dịch vụ/bảng giá/thời lượng/checklist; can thiệp lịch; nhân viên/phân công; lịch sử; mẫu thông báo/nhắc lịch; thống kê/dịch vụ phổ biến; doanh thu ngày/tháng/năm; giờ mở cửa/sức chứa/hạn hủy |

## Quy tắc triển khai

- Một app với bốn vai trò; nhân viên thao tác toàn bộ gara trong bản hiện tại. Đăng ký công khai chỉ tạo khách hàng.
- Lịch bắt đầu ở mốc 00/30 phút, trong giờ làm việc, theo giờ Việt Nam UTC+7. Kiểm tra trùng lịch xe và sức chứa đồng thời bằng khóa giao dịch.
- Luồng chính: pending → confirmed → received → assigned → accepted → in_progress → ready → completed. Nhánh phụ: reschedule_proposed, rejected, cancelled.
- Khách chấp nhận/từ chối giờ do tiếp nhận đề xuất. Hủy/đổi theo hạn cấu hình.
- Giá và checklist được lưu tại lúc đặt, sửa dịch vụ không đổi lịch cũ.
- Khách duyệt chi phí phát sinh; checklist đầy đủ và phát sinh đã xử lý mới được hoàn tất. Bàn giao cần đã thanh toán.
- Doanh thu tính từ lịch đã thanh toán và bàn giao, theo ngày bàn giao.
- Khóa tài khoản thu hồi phiên; không khóa kỹ thuật viên đang có công việc chưa xử lý xong.

## Giới hạn và giả định

- Thanh toán được ghi nhận thủ công, chưa tích hợp cổng thanh toán. Chưa có SMS/email, xác minh liên hệ, quên mật khẩu hay push từ xa.
- Thông báo trong app lưu trên server. Nhắc cục bộ cần người dùng cấp quyền và mở app để đồng bộ. Thay đổi lịch khi app đóng chưa thể cập nhật tức thì vào lịch nhắc của thiết bị.
- SDK 58 Expo Go dùng workaround chỉ import local-notification API để tránh module ExpoApplication không có sẵn. Kiểm tra lại các đường dẫn trong `mobile/src/services/local-notifications.ts` khi nâng SDK.
- Camera/thư viện ảnh cần quyền thiết bị. Ảnh tối đa 2 MB lưu dạng data URI trong PostgreSQL; triển khai thật nên dùng object storage.
- Ngày/giờ nhập theo định dạng có nhãn; chưa có bảng chọn slot còn trống trực quan.
- Báo cáo tổng quan khách/xe/doanh thu nằm trong màn Thống kê; trang chủ admin có các lối vào nghiệp vụ.
- Đây là bản phát triển cục bộ; chưa triển khai HTTPS/production, sao lưu tự động, kiểm thử tải hoặc iOS.

Chi tiết mức độ kiểm thử xem [TEST-REPORT.md](TEST-REPORT.md).
