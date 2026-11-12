# Tổng quan và cảnh báo bảo dưỡng

## Bốn ô tổng quan

- Xe đang sử dụng: số xe chưa lưu trữ, mở danh sách xe.
- Quá hạn, Đến hạn, Sắp đến hạn: đếm số xe có ít nhất một lịch thuộc trạng thái tương ứng. Một xe có nhiều lịch cùng trạng thái chỉ tính một lần.
- Một xe có thể xuất hiện ở nhiều nhóm nếu các lịch khác nhau có trạng thái khác nhau; không cộng ba nhóm để tính tổng xe.
- Bấm ô mở danh sách xe đã lọc. Bấm Xem lịch bảo dưỡng trên xe giữ cả bộ lọc xe và trạng thái.
- Lịch hoàn thành, đã hủy và xe lưu trữ không tính vào ba ô cảnh báo.

## Tổng chi phí

Bấm "Chi phí đã ghi nhận" mở lịch sử với bộ lọc "Có phát sinh chi phí". Danh sách gồm bản ghi có chi phí lớn hơn 0, cả xe đang dùng và xe lưu trữ, phù hợp cách tính tổng trên trang chủ. Có thể xem chi tiết từng lần, lọc thêm theo xe/hạng mục/ngày hoặc chọn "Tất cả lịch sử" để xem cả những lần không phát sinh tiền. Tổng chi phí trên trang lịch sử cập nhật theo các bộ lọc hiện tại.

Màn hình Chi phí có bộ lọc xe, hạng mục, từ ngày/đến ngày và nhóm theo tháng/năm/hạng mục. Chọn tháng hoặc năm cụ thể bằng hộp chọn; có thể chuyển năm và xem tất cả trở lại. Bộ lọc kỳ áp dụng đồng thời với xe, hạng mục và khoảng ngày, cả số tổng hợp lẫn danh sách chi tiết. Chuyển cách nhóm sẽ bỏ lựa chọn kỳ trước đó. Tháng/năm không có dữ liệu hiển thị trạng thái trống. Phần chi tiết từng lần hiển thị xe, hạng mục, ngày thực hiện, chi phí; bấm từng khoản mở đúng lần bảo dưỡng theo ID. Tổng hợp theo tháng/năm có nhãn dễ đọc như Tháng 11/2026.

## Nhãn cảnh báo

- Sắp đến hạn: còn 2 ngày; hoặc còn 500 km; hoặc cả hai.
- Đến hạn hôm nay đối với lịch vừa đến mốc ngày.
- Quá hạn theo km: vượt 16.000 km khi xe ở 20.000 km và đặt mốc 4.000 km, dù ngày dự kiến vẫn trong tương lai.
- Quá hạn theo ngày: trễ 3 ngày. Nếu cả hai tiêu chí đều quá hạn, ghi rõ cả ngày và km.
- Phần giải thích bên dưới tách riêng từng tiêu chí, cho biết còn bao nhiêu ngày/km hoặc đã vượt bao nhiêu. Không coi tiêu chí tương lai là quá hạn chỉ vì tiêu chí còn lại đã quá hạn.
- Nhãn đỏ cho quá hạn, vàng cho đến/sắp đến hạn; vẫn giữ chữ giải thích để không phụ thuộc màu.
- Trạng thái nghiệp vụ do backend quyết định; client bổ sung nội dung giải thích, không đổi quy tắc hoàn thành/hủy lịch.

## Bố cục

Trang chủ dùng một cột ở cửa sổ dưới 340 px hoặc khi hệ số chữ hệ thống từ 1,5; hai cột trên điện thoại/tablet thông thường; bốn cột từ 1024 px. Nội dung trang chủ giới hạn 1000 px và căn giữa, các form giới hạn 650 px. Các thẻ tăng chiều cao theo chữ, màn hình có thể cuộn dọc.

Responsive của app/web không đồng nghĩa hỗ trợ Android Auto hoặc Apple CarPlay. Chưa kiểm thử phần tích hợp màn hình xe hay Safari/macOS trong lượt này.

## Kiểm tra

- `backend/node_modules/.bin/tsx.cmd mobile/tests/maintenance-overview.ts`: mốc ngày/km độc lập, cùng đến hạn, ngày nhuận dùng test giá trị ngày riêng, đếm xe không trùng, loại xe lưu trữ.
- `mobile/tests/personal-ui.cjs`: tài khoản thử riêng, kiểm tra bốn ô dẫn đúng danh sách, một xe có hai lịch quá hạn vẫn đếm một, lọc lịch từ xe và nhãn còn 2 ngày. Kiểm tra responsive trên Edge ở 320, 390, 768, 1024, 1440 px và các form ở 320, 768, 1440 px. Ảnh kết quả tại `docs/test-results/` (không commit).
- Cần tiếp tục thử trên thiết bị iPhone/iPad và bản build phát hành trước khi xác nhận hỗ trợ các thiết bị cụ thể.
