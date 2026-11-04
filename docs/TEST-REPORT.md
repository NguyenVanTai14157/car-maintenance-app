# Báo cáo kiểm thử — 03/11/2026

| Kiểm tra | Kết quả |
|---|---|
| API + PostgreSQL thực | PASS 77 assertions |
| Giao diện web cùng mã React Native | PASS 20 checkpoints; không có browser runtime error |
| TypeScript backend | PASS |
| ESLint và TypeScript mobile | PASS |
| Máy ảo Android / Expo Go | Mở được màn đăng nhập, không còn lỗi ExpoApplication lúc khởi động |

## Nội dung kiểm thử

- API: đăng ký/đăng nhập, chặn tự cấp role, trùng tài khoản/sai mật khẩu; quyền sở hữu xe/lịch; km; đặt lịch đồng thời vượt sức chứa; các bước trạng thái hợp lệ và không hợp lệ.
- Xác nhận, từ chối, hủy, đổi giờ, tiếp nhận, phân công, nhận việc, bắt đầu; checklist, ảnh qua API, phát sinh và khách duyệt; hoàn tất, thanh toán, bàn giao; đánh giá và chống đánh giá trùng.
- Báo cáo; nhắc trong DB không tạo trùng; hồ sơ; khóa tài khoản và thu hồi phiên đăng xuất.
- UI: đăng ký, giữ phiên khi reload, thêm xe, đặt lịch; đăng nhập ba vai trò nội bộ; các màn quản trị; tiếp nhận/giao việc; kỹ thuật viên/checklist/hoàn thành; thanh toán/bàn giao; khách đánh giá; chặn route quản trị với khách.
- Fixture được dọn theo ID riêng, không xóa dữ liệu người dùng có sẵn.

Đã xem trực tiếp màn đăng nhập Android và ảnh web màn quản trị, lịch khách hàng, báo cáo. Ảnh nằm trong `docs/test-results/`.

## Chưa được xác nhận

- Chưa chạy toàn bộ 20 bước UI trên Android/iOS; E2E chạy bằng Edge với viewport 390×844.
- Chưa xác nhận phát thông báo nền trên điện thoại thật hay thao tác camera thực tế. Các quyền thiết bị do người dùng cấp.
- Chưa kiểm thử tải, production, mạng gián đoạn kéo dài. Không có tích hợp thanh toán online/push từ xa để kiểm thử.

## Chạy lại

1. Backend và PostgreSQL chạy, API cổng 3000.
2. Trong backend: `npm test`, `npx tsc --noEmit`.
3. Trong mobile: `npm run lint`, `npm run typecheck`.
4. Chạy `npm run web -- --port 8083`; terminal mobile khác: `node tests/ui.cjs`.

Cần Microsoft Edge, dữ liệu seed và DEMO_PASSWORD khớp. Chỉ chạy với database phát triển.

Tài khoản mẫu xem `.demo-accounts.md` ở thư mục gốc. Luồng demo: khách thêm xe/đặt lịch → tiếp nhận xác nhận/nhận xe/giao việc → kỹ thuật viên nhận/bắt đầu/checklist/hoàn thành → tiếp nhận thanh toán/bàn giao → khách đánh giá.

## Sửa nhắc lịch Android — 04/11/2026

- Tái hiện native NullPointerException ở setNotificationChannelAsync trên Expo Go máy ảo Android 16, với cả cấu hình tối thiểu và cấu hình đầy đủ.
- Bổ sung fallback chỉ cho lỗi này trong Expo Go: bỏ channelId để dùng kênh mặc định của thư viện. Các lỗi khác vẫn báo thất bại; không báo bật thành công nếu chưa được cấp quyền.
- Dùng isRunningInExpoGo() để nhận diện runtime; Constants.executionEnvironment trên runtime này trả bare dù đang ở Expo Go.
- Kiểm thử native bản sửa: chọn kênh mặc định, đặt lịch thử tương lai, đọc lại thấy lịch, hủy lịch thử đều thành công. Dữ liệu thử đã được hủy.
- Quyền thông báo trên máy ảo đang bị từ chối; chưa xác nhận hiển thị thông báo thực tế. Người dùng cần tự cấp quyền.
- Test hồi quy: node tests/notification-channel.cjs kiểm tra Android thành công, iOS bỏ qua channel, fallback Expo Go, và không nuốt lỗi ngoài phạm vi.

## Chuẩn hóa backend — 04/11/2026

Đã tách 8 feature module, controller/service/repository, input DTO, guard/filter, database provider và lifecycle tác vụ nhắc lịch. API và schema giữ nguyên. Kiểm thử 77 assertions đã đạt trên bản mới chạy bằng tsx và bản build JavaScript (cổng thử 3001). Typecheck và build đạt. Đợt này không chạy lại kiểm thử giao diện mobile vì thay đổi chỉ ở backend và các endpoint được giữ nguyên.

## Realtime — 04/11/2026

- PASS 77 kiểm tra nghiệp vụ sau khi thêm trigger và gateway.
- PASS 17 kiểm tra realtime: chặn token sai, phân phối đúng khách/nhân viên, không gửi row payload, COMMIT/ROLLBACK, đổi kỹ thuật viên, thông báo riêng, đăng xuất/khóa tài khoản và dữ liệu sau reconnect.
- PASS UI hai phiên khách/tiếp nhận trên Edge: lịch mới thấy sau 117 ms, xác nhận thấy sau 397 ms trong lần chạy này; thông báo xuất hiện không reload; không có browser runtime error. Thời gian là kết quả cục bộ, không phải cam kết độ trễ trên mọi mạng.
- Socket native dùng chung client nhưng chưa kiểm thử trọn luồng realtime giữa điện thoại Android và iPhone thật. Không xác nhận push khi đóng app.
- Chi tiết vận hành tại REALTIME.md.

## Tải nhóm ảnh trước/sau — 04/11/2026

- Kỹ thuật viên có thể chọn nhiều ảnh thư viện cùng lần; camera chụp một ảnh mỗi mục. Mỗi mục tải thành công một lần thì ẩn ô tải, giữ các ảnh đã lưu.
- API tiếp nhận images hoặc data (tương thích client cũ); lưu toàn bộ nhóm trong một transaction và chặn gửi lại cùng kind. Ảnh trùng byte trong một nhóm chỉ lưu một lần. Giới hạn kỹ thuật 10 ảnh/nhóm, từng ảnh được kiểm tra trước khi lưu; body lớn chỉ áp dụng route appointments.
- PASS 83 assertions nghiệp vụ: bổ sung nhóm rỗng, ảnh lỗi không lưu một phần, nhiều ảnh và ảnh trùng, chặn tải lại cả before/after.
- PASS photo-upload-ui.cjs trên web với API ảnh giả lập: bộ chọn nhận hai file trước và hai file sau, từng ô ẩn sau lưu, bốn ảnh giữ khi reload. Không thay đổi ảnh của lịch người dùng.
- TypeScript và lint đạt. Chưa kiểm thử lại bộ chọn nhiều ảnh trên iPhone/Android thật và quyền camera.

## Nhóm ảnh và sửa/xóa — 04/11/2026

- Tách Hình ảnh trước và Hình ảnh sau; nút Sửa/Xóa nằm dưới từng ảnh, bên phải. Chỉ kỹ thuật viên được phân công và lịch accepted/in_progress được thao tác.
- Sửa mở bộ chọn/chụp ảnh để thay một ảnh, giữ ID và nhóm. Xóa có xác nhận. Xóa hết nhóm thì ô tải nhóm đó mở lại. Các vai trò khác chỉ xem ảnh.
- PASS 99 assertions: thêm kiểm tra sửa/xóa, sai quyền, ID không thuộc lịch, ảnh thay thế lỗi, giữ kind, chặn sửa/xóa sau hoàn tất và tải lại nhóm trống.
- PASS photo-upload-ui.cjs với API ảnh giả lập: tải nhiều ảnh, nhóm riêng, thay một ảnh, hủy/xác nhận xóa, hiện ô tải khi nhóm rỗng, giữ nhóm còn lại và reload. Ảnh kiểm thử ở docs/test-results/photo-groups.png.
- TypeScript/lint đạt. Chưa kiểm thử lại camera và bộ chọn native trên điện thoại thật.

## Bắt buộc ảnh trước/sau khi hoàn thành — 04/11/2026

Backend kiểm tra mỗi nhóm có ít nhất một ảnh trước khi chuyển ready; giao diện khóa nút và giải thích khi còn thiếu. Xóa hết một nhóm trong lúc đang làm sẽ khóa lại nút. Checklist và duyệt phát sinh vẫn là điều kiện bắt buộc như trước.

PASS 102 assertions nghiệp vụ: không ảnh, chỉ ảnh trước, xóa hết ảnh sau đều không được hoàn thành; đủ hai nhóm thì được. Kiểm thử giao diện web API ảnh giả lập xác nhận trạng thái nút khóa/mở/khóa lại. TypeScript và lint đạt.

## Rà soát ràng buộc — 04/11/2026

Xem CONSTRAINT-AUDIT.md: 995 yêu cầu lỗi trả đúng mã; 963 đối chiếu dòng lịch không thay đổi; 2 trường hợp đồng thời; 102 assertions nghiệp vụ và 20 checkpoints giao diện đạt. Đã sửa kiểm tra ngày lịch, kiểu số nguyên, phản hồi ID gara/dịch vụ không tồn tại và khóa khi cập nhật km. Còn quy tắc cần BA chốt và phạm vi chưa kiểm chứng được nêu rõ trong báo cáo.
