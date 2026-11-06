# Realtime

Backend Socket.IO namespace `/realtime`, dùng chung cổng HTTP 3000. React Native và web dùng socket.io-client. Không cần build native mới chỉ vì Socket.IO.

## Luồng cập nhật

1. API xác minh quyền và ghi dữ liệu trong PostgreSQL.
2. Trigger `002_realtime.sql` gửi `autocare_changes` sau COMMIT; ROLLBACK không phát cập nhật.
3. RealtimeGateway nghe bằng kết nối PostgreSQL riêng, xác minh lại JWT/phiên/tài khoản và gửi `data:changed` cho đối tượng phù hợp.
4. Sự kiện gửi tên nhóm dữ liệu cần tải lại; không gửi thông tin khách, ảnh, giá hay nội dung lịch qua socket.
5. useData tải lại endpoint tương ứng sau debounce 100 ms. API tiếp tục kiểm tra quyền sở hữu.

Cập nhật gồm lịch hẹn/chi tiết/checklist/phát sinh/ảnh/đánh giá, xe, dịch vụ, gara, nhân viên, hồ sơ, báo cáo và thông báo. Khách thấy dữ liệu của mình; kỹ thuật viên thấy việc được giao. Đổi phân công báo cả người cũ và mới để danh sách được làm mới. Admin/tiếp nhận nhận cập nhật nghiệp vụ theo quyền hiện tại.

Không có API socket cho khách tự chọn phòng hoặc sửa lịch. Các thao tác ghi vẫn qua HTTP có kiểm tra quyền và giao dịch.

## Kết nối và phiên

- Socket gửi token trong handshake auth; không đưa token vào URL.
- Đăng nhập mới hoặc kết nối lại tự tải dữ liệu. App trở lại foreground cũng đồng bộ.
- Mất socket thì thử kết nối lại; fallback tải dữ liệu mỗi 30 giây trong lúc ngắt kết nối.
- Đăng xuất dọn kết nối và listener. Thu hồi phiên/khóa tài khoản gây session:expired và đóng socket; phiên cũng được kiểm tra định kỳ 30 giây và trước mỗi lần gửi sự kiện.
- Bộ nghe PostgreSQL tự kết nối lại sau 3 giây; sau LISTEN lại sẽ gửi yêu cầu đồng bộ để bù khoảng bị ngắt.
- LISTEN/NOTIFY không lưu hàng đợi replay lâu dài. Database/API là nguồn dữ liệu chính.
- Realtime không thay thế push khi app bị đóng hoặc hệ điều hành dừng chạy nền. Push từ xa chưa tích hợp.

## Chạy và kiểm thử

Chạy backend `npm run dev` và Expo như trước, cùng Wi-Fi và backend truy cập được ở cổng 3000. Trang chủ hiển thị trạng thái cập nhật trực tiếp.

Trong backend:

```powershell
npm test
npm run test:realtime
```

`test:realtime` mặc định API cổng 3001 để kiểm tra riêng; đặt TEST_API_URL nếu dùng cổng 3000. `npm test` mặc định cổng 3000.

Kiểm thử UI cần backend cổng 3000, web cổng 8083 (`npm run web -- --port 8083` trong mobile), Microsoft Edge và PostgreSQL: chạy `npm run test:realtime:ui` trong backend.

Các bài test tạo và dọn dữ liệu fixture riêng. Chỉ chạy trên database phát triển. Dùng nhiều thiết bị cần mỗi thiết bị đăng nhập đúng vai trò; không phải đăng xuất thiết bị trước rồi mới thao tác thiết bị khác.
