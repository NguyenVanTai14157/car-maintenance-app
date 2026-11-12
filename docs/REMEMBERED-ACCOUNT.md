# Ghi nhớ tài khoản

- Phiên đăng nhập trên Android/iOS đã được lưu bằng SecureStore. Khi mở lại app và phiên vẫn hợp lệ, người dùng không cần nhập lại mật khẩu. Phiên hiện có hạn 7 ngày; đăng xuất, đặt lại mật khẩu hoặc tài khoản bị khóa vẫn kết thúc phiên theo quy tắc hiện tại.
- Ô "Ghi nhớ tài khoản" chỉ lưu email sau lần đăng nhập/đăng ký thành công. Sau khi đăng xuất hoặc phiên hết hạn, màn hình đăng nhập tự điền email và vẫn để trống mật khẩu.
- Android/iOS lưu email trong SecureStore; web dùng localStorage cho email, còn phiên web vẫn dùng sessionStorage như trước.
- Bỏ chọn rồi đăng nhập thành công sẽ xóa email đã ghi nhớ trên thiết bị. Không xóa tài khoản trên server.
- Mật khẩu không được lưu trong tính năng ghi nhớ. Ô email/mật khẩu có gợi ý tự điền cho trình quản lý mật khẩu của hệ điều hành/trình duyệt.
- Nếu không lưu được tùy chọn ghi nhớ, đăng nhập vẫn được tiếp tục và người dùng nhận thông báo cần nhập email lại lần sau.
- Không đổi API đăng nhập, thời hạn phiên hoặc hành vi đăng xuất.

Kiểm thử: tải lại khi đang đăng nhập, đăng xuất rồi tải lại để kiểm tra email được điền và mật khẩu trống, trạng thái checkbox hỗ trợ trợ năng, kiểm tra kho email không chứa mật khẩu, bỏ chọn/đăng nhập/đăng xuất rồi tải lại để xác minh email đã xóa. Chạy trong `mobile/tests/personal-ui.cjs` với tài khoản thử riêng.
