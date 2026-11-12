# Rà soát form mobile — 11/11/2026

## Thay đổi

- Lịch bảo dưỡng, ngày thực hiện, bộ lọc lịch sử và chi phí dùng bộ chọn ngày. Android dùng lịch hệ thống; iOS có lịch trong hộp chọn với Chọn ngày/Hủy; web dùng input date.
- App hiển thị ngày/tháng/năm. Dữ liệu gửi API vẫn YYYY-MM-DD, không chuyển ngày qua UTC.
- Ngày thực hiện không được chọn sau hôm nay. Bộ lọc ràng buộc ngày bắt đầu/kết thúc. Ngày dự kiến cho phép quá khứ để theo dõi việc quá hạn.
- Ngày tùy chọn có nút Xóa, hủy lịch không thay giá trị; ngày thực hiện bắt buộc không có nút Xóa.
- Ô km, số ngày nhắc, chu kỳ tháng/km và chi phí có đơn vị cố định. Giữ số thô trong ô để tránh làm thay đổi vùng chọn khi sửa; dòng xem trước "Giá trị: …" đã bỏ theo yêu cầu.
- Chấp nhận dán số có nhóm hàng nghìn như 650.000. Không biến số âm hoặc số thập phân không hợp lệ thành một số khác.
- Ghi chú/nội dung hỗ trợ nhiều dòng, số điện thoại dùng bàn phím điện thoại, thêm gợi ý về công-tơ-mét và chu kỳ bảo dưỡng.
- Thêm hạng mục ngay tại form kế hoạch và ghi nhận độc lập; lưu xong tự chọn mục mới, giữ dữ liệu đang nhập. Bỏ dòng giải thích "Nhập ngày, km… ghi rõ lý do" ở form kế hoạch.

## Đã kiểm tra

- TypeScript và ESLint cho mobile.
- 12 luồng Playwright trên Edge với tài khoản thử riêng: đăng ký/phiên, xe, lịch, ghi nhận, đề xuất lịch tiếp theo, chi phí, tìm/sửa lịch sử, xuất/khôi phục, xóa bản ghi và khôi phục mật khẩu. Tài khoản và dữ liệu thử được dọn sau khi chạy.
- Bổ sung xác minh chọn/xóa ngày nhuận, lưu ngày/km chính xác qua API, giới hạn ngày thực hiện, ràng buộc khoảng ngày lọc, dán tiền có dấu phân cách và sửa tiền đã lưu.
- Đã chạy lại 12 luồng sau khi thêm hạng mục tại chỗ: tên trống bị chặn, hủy không mất số km, tạo mục mới giữ ngày/km, lưu kế hoạch đúng mục vừa tạo.
- Máy ảo Android/Expo Go: mở lịch hệ thống, chọn 20/11/2026, xác nhận hiển thị đúng ngày, mở lại rồi hủy giữ nguyên giá trị, xóa ngày tùy chọn. Không lưu thay đổi vào lịch của người dùng khi thử.
- Test riêng ngày nhuận, ngày không hợp lệ, round trip ngày trong Asia/Bangkok, America/Los_Angeles và Pacific/Kiritimati; kiểm tra chuẩn hóa số và giữ nguyên đầu vào không hợp lệ để server kiểm tra.

## Giới hạn

Chưa thao tác trực tiếp trên iPhone trong lượt này. Kiểm tra form này không thay thế kiểm thử bản build phát hành, bàn phím/trợ năng trên thiết bị thật hay nghiệm thu đưa lên cửa hàng.

## Chạy lại

```powershell
cd D:\car-maintenance-app\mobile
npm run typecheck
npm run lint
# Cần backend 3000, Expo web 8083 và Edge; dùng database phát triển.
$env:TEST_API_URL='http://127.0.0.1:3000'
$env:TEST_WEB_URL='http://127.0.0.1:8083'
npm run test:ui
```

Test giá trị thuần từ thư mục gốc: `backend/node_modules/.bin/tsx.cmd mobile/tests/input-values.ts`.
