# Kiểm thử web admin và sửa lỗi QA — 05/11/2026

## Bản triển khai

Next.js 16.4.5, React 19.3.1, Ant Design 6.7.0. Web production build ở localhost:3001; Nest mới ở 127.0.0.1:3002 dùng database cá nhân hiện tại. Sau kiểm thử, đã khởi động lại backend chính cổng 3000 bằng mã mới và nối web 3001 về cùng backend. Expo/máy ảo giữ nguyên; backend preview 3002 được dừng. Không còn thư mục backend-updates ở gốc; web nằm trong admin-web, API nằm trong backend.

## Kết quả

| Kiểm tra | Kết quả |
| --- | --- |
| Admin web typecheck | PASS |
| Admin web lint | PASS |
| Admin web production build | PASS, đủ các trang và API |
| UI thực tế Edge/Playwright | PASS 18 luồng, không có browser pageerror |
| Kiểm tra ảnh bằng mắt | Đã xem trang login và dashboard; ảnh lưu docs/test-results/admin-web |
| Production dependency audit | 0 vulnerabilities theo npm audit --omit=dev |
| Backend build/format | PASS |
| Mobile typecheck/lint sau sửa profile/plan-edit | PASS |
| Sáu ca hồi quy BUG-01/02/03 | PASS 6/6 trên API 3002 và chạy lại đạt trên backend chính 3000 |

## 18 luồng web đã kiểm thử

1. Chưa đăng nhập mở trang users được đưa về login.
2. Login POST khác Origin bị chặn 403.
3. Mật khẩu sai hiển thị lỗi rõ ràng.
4. Login admin đúng, vào dashboard; cookie HttpOnly, response không có accessToken.
5. Thêm người dùng qua modal và đối chiếu API/DB.
6. Tìm và sửa họ tên người dùng.
7. Khóa/mở khóa tài khoản qua xác nhận.
8. Thêm hãng xe.
9. Thêm loại xe.
10. Thêm dòng xe liên kết hãng/loại.
11. Xem xe của người dùng và lịch sử/chi phí thực tế ở drawer.
12. Chặn xóa tài khoản có xe, hiển thị đúng lỗi nghiệp vụ.
13. Xem nhật ký ghi nhận các mutation vừa làm.
14. Gắn JWT của user thường vào cookie không vượt quyền admin: API trả 403.
15. Sửa hồ sơ và đổi mật khẩu admin thử.
16. Đăng xuất, quên mật khẩu bằng hộp thư preview, đặt mật khẩu mới.
17. Login lại bằng mật khẩu đã đặt, dashboard dùng dữ liệu thật.
18. Menu responsive ở viewport 390×844; không lỗi runtime trình duyệt.

Test dùng admin và user thử có prefix web-qa-<timestamp>. Dọn đúng tài khoản/xe/danh mục/nhật ký/file mail do lượt test tạo; giữ admin local cho chủ dự án và dữ liệu hiện có của chủ dự án. Chưa kiểm thử UI trên Safari/iPhone thật hoặc triển khai HTTPS production.

## Ba lỗi trong báo cáo Anti

- BUG-01: khi PATCH record, chặn đổi sang xe lưu trữ khác hoặc hạng mục ngừng dùng khác; giữ nguyên bản ghi và số km khi bị chặn. Giữ nguyên xe/hạng mục gốc vẫn sửa nội dung/chi phí được.
- BUG-03: kế hoạch đang mở được giữ hạng mục gốc đã ngừng sử dụng khi sửa ngày/km/ghi chú; chip hạng mục gốc vẫn có trên form. Đổi sang hạng mục ngừng dùng khác hoặc xe lưu trữ vẫn bị chặn.
- BUG-02: tách state tác vụ thông tin cá nhân/đổi mật khẩu/đăng xuất; đặt Feedback ngay trong từng thẻ tương ứng.

`backend/tests/qa-regressions.cjs` kế thừa sáu kịch bản của Anti, siết cleanup theo prefix duy nhất của lượt chạy. Log mới ở backend/tests/qa-regressions.log (ignored). Các ca API kiểm tra trạng thái HTTP và DB; phần bố trí Feedback/chip trong kịch bản này kiểm tra source, chưa thay thế xác nhận tương tác native trên điện thoại thật.

Báo cáo Anti gốc ở docs/test-results/ANTIGRAVITY-PERSONAL-TEST.md giữ nguyên để đối chiếu thời điểm trước sửa. Phần ghi admin chưa ghép trong báo cáo đó là trạng thái trước khi tích hợp, không phải trạng thái mới hiện tại.

Lượt xác nhận cuối: sau khi chuyển về backend chung 3000, 18 luồng web tiếp tục đạt. Web 3001 và backend 3000 được giữ chạy để người dùng xem thử.
