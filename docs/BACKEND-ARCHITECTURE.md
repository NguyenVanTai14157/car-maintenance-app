# Kiến trúc backend cá nhân

Nest AppModule đăng ký DatabaseModule, AuthModule, PersonalModule và RealtimeModule. Controller xử lý HTTP và lấy owner từ request đã xác thực; service áp dụng nghiệp vụ; repository sở hữu SQL parameterized. Hàm kiểm tra dữ liệu/trạng thái/chu kỳ tập trung tại personal.rules.ts để kiểm thử độc lập.

Auth có service/repository và recovery service/mailer riêng. PersonalModule gom miền quản lý cá nhân gồm controller/service cho xe, hạng mục, kế hoạch, bản ghi, dashboard, cài đặt, backup và inbox. PersonalRepository dùng whitelist bảng/cột cố định, tự bỏ owner_id do client gửi và luôn ràng owner vào WHERE/INSERT. Không còn route quản trị/tiếp nhận/kỹ thuật viên.

Mỗi thay đổi nhiều bước dùng transaction PostgreSQL với advisory lock theo tài khoản: ghi bản ghi + tăng km xe, tạo lịch theo chu kỳ, restore toàn bộ dữ liệu. Kế hoạch hoàn thành được suy ra từ liên kết records.plan_id UNIQUE thay vì cập nhật trạng thái rời rạc dễ lệch. Ngày/km được tính lại khi đọc; ngày DATE giữ chuỗi YYYY-MM-DD để tránh lệch múi giờ.

Migration được bọc transaction và lock chung lúc khởi động. Nếu phát hiện bảng appointments của bản gara, server từ chối dùng database đó trước khi chạy DDL; dùng database riêng cho bản cá nhân. DatabaseService quản lý vòng đời pool.

PostgreSQL trigger phát LISTEN/NOTIFY sau commit; RealtimeGateway xác thực lại phiên và chỉ phát data:changed tới owner liên quan. Client đọc lại API, không tin dữ liệu socket như một nguồn có thể bỏ qua guard. Có polling fallback và resync khi nối lại. Thu hồi phiên làm socket cũ bị ngắt.

Recovery dùng random token 32 byte, SHA-256 trong DB, một lần/15 phút; khóa user rồi khóa token theo cùng thứ tự để tránh deadlock khi gửi lại/đổi đồng thời. Bcrypt xử lý mật khẩu. Preview file nằm ngoài HTTP static và bị bỏ qua khi Git; production yêu cầu SMTP.

Đây là cấu trúc cho một miền cá nhân có liên kết chặt. Khi cần tách đội/nghiệp vụ lớn hơn có thể tách PersonalModule thành feature module; không cần thay hợp đồng API hoặc logic sở hữu dữ liệu.
