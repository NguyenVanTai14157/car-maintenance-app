# Cách dùng từ trong app cá nhân

Viết cho người dùng chăm sóc xe của chính mình. Tên hàm, route và trường API giữ nguyên; nội dung hiển thị phải dùng từ quen thuộc.

| Tránh dùng trên giao diện | Dùng theo ngữ cảnh |
| --- | --- |
| Bản ghi | Lần bảo dưỡng, thông tin bảo dưỡng |
| Xem bản ghi | Xem chi tiết bảo dưỡng |
| Sửa bản ghi | Sửa thông tin bảo dưỡng |
| Xóa bản ghi | Xóa lần bảo dưỡng này |
| Kế hoạch | Lịch bảo dưỡng |
| Xem kế hoạch | Xem chi tiết lịch |
| Lưu kế hoạch | Lưu lịch bảo dưỡng |
| File JSON | Bản sao dự phòng |
| Đồng bộ lời nhắc | Cập nhật lời nhắc |
| Backend đang chạy | Kiểm tra kết nối mạng rồi thử lại |
| Kênh thông báo | Thông báo nhắc lịch |
| ID trùng trong bản sao | Thông tin bị lặp trong bản sao |

Nút thêm lần bảo dưỡng dùng cho việc đã thực hiện; đặt lịch dùng cho việc dự kiến. Không làm người dùng hiểu lưu lần bảo dưỡng độc lập sẽ tự hoàn thành một lịch đã đặt.

Thông tin xe, ngày, số km, chi phí và ghi chú có nhãn rõ ràng. Tránh thêm hướng dẫn dài ở mọi ô; dùng ví dụ hoặc bộ chọn thích hợp. Giữ cảnh báo có ảnh hưởng đến dữ liệu:

- Xóa lần bảo dưỡng: tổng chi phí được tính lại; lịch từng được hoàn thành bởi lần này được mở lại và nhắc tiếp.
- Hủy lịch: ngừng nhắc lịch đó, giữ lịch sử đã lưu.
- Khôi phục: thay thế dữ liệu hiện có bằng bản sao đã chọn.
- Xóa xe/hạng mục: server vẫn chặn nếu đã được sử dụng; hướng dẫn lưu trữ hoặc ngừng sử dụng để giữ lịch sử.

Đã cập nhật cả câu chữ ở mobile và lỗi từ API miền cá nhân. Không đổi schema, route hoặc quy tắc nghiệp vụ. Bộ kiểm thử giao diện đã cập nhật tên nút mới và chạy qua 15 luồng; TypeScript/lint mobile, build backend và kiểm thử thông báo đều qua.
