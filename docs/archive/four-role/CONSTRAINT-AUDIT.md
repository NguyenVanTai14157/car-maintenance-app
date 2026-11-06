# Rà soát ràng buộc — 04/11/2026

## Kết luận

Các test trước có cả luồng thành công và một số trường hợp lỗi, nhưng chưa bao phủ đầy đủ tổ hợp vai trò/trạng thái và dữ liệu biên. Không được dùng số lượng assertion để kết luận đã kiểm thử toàn bộ nghiệp vụ.

Đợt này bổ sung test gọi thẳng API, độc lập với việc nút có bị khóa trên màn hình hay không.

## Bằng chứng lần chạy cuối

| Bộ kiểm tra | Kết quả và phạm vi |
|---|---|
| Ma trận chuyển trạng thái và quyền | 963 yêu cầu bị cấm qua 24 hành động, 4 vai trò, 11 trạng thái; tất cả trả đúng mã 400/403 |
| Giữ nguyên dữ liệu khi bị chặn | 963 lần đối chiếu dòng appointments trước/sau; không đổi |
| Dữ liệu và điều kiện bổ sung | 32 yêu cầu lỗi (tổng số yêu cầu từ chối 995), gồm ngày/giờ, dịch vụ, số km, ID không tồn tại, hạn hủy/đổi, tiếp nhận/checklist/phát sinh, gara ngừng hoạt động, khóa kỹ thuật viên có việc |
| Đồng thời bổ sung | Hai lần xác nhận đồng thời chỉ một thành công; sửa số km đồng thời không làm số km cuối giảm |
| Bộ nghiệp vụ hiện có | 102 assertions đạt, gồm luồng thành công, đặt lịch đồng thời, ảnh trước/sau bắt buộc, sửa/xóa ảnh, chi phí phát sinh, thanh toán, bàn giao và đánh giá |
| Giao diện | 20 checkpoints trên web cùng mã React Native; đi hết bốn vai trò, không có browser runtime error |
| Build/TypeScript/định dạng backend | Đạt |

Ma trận thử các tổ hợp bị cấm. Nó không thay thế test thành công với dữ liệu hợp lệ cho từng nhánh, và không phải kiểm chứng mọi tình huống trên điện thoại thật.

## Các lỗi đã tìm thấy và sửa

- Ngày không tồn tại (ví dụ 30/02) bị Date tự chuyển sang ngày khác: yêu cầu ngày lịch hợp lệ và múi giờ rõ ràng.
- Hàm số nguyên ép kiểu quá rộng: từ chối boolean/mảng/object/chuỗi trắng/chuỗi khoa học. Chuỗi số thập phân và số nguyên vẫn dùng được.
- Sửa dịch vụ/gara ID hợp lệ nhưng không tồn tại từng không trả lỗi rõ: nay trả 404.
- Đọc km rồi cập nhật ở hai truy vấn không khóa có thể ghi lùi khi đồng thời: nay dùng transaction và khóa dòng xe trước khi so sánh.

## Quy tắc đang thực thi

| Bước | Điều kiện đã kiểm tra |
|---|---|
| Đặt lịch | Khách sở hữu xe; dịch vụ đang cung cấp; gara hoạt động; thời gian tương lai, ngày tồn tại, mốc 00/30, nằm trong giờ phục vụ; không trùng lịch xe/vượt sức chứa |
| Xác nhận/từ chối/đổi/hủy | Đúng vai trò và trạng thái; lý do khi cần; khách tuân thủ hạn hủy/đổi; khách khác không truy cập lịch |
| Tiếp nhận | Đã xác nhận; có tình trạng xe; km hợp lệ và không giảm |
| Phân công/nhận/bắt đầu | Kỹ thuật viên hoạt động; không trùng giờ; đúng người được phân công; đúng thứ tự trạng thái |
| Checklist/phát sinh | Checklist đúng số mục và boolean; chi phí hợp lệ; chỉ khách của lịch được duyệt; không duyệt đề xuất hai lần |
| Ảnh | Đúng kỹ thuật viên và giai đoạn; nhóm ảnh hợp lệ và lưu nguyên nhóm; sửa/xóa đúng ảnh thuộc lịch; không sửa sau hoàn thành |
| Hoàn thành | Checklist đầy đủ, không còn phát sinh chờ duyệt, có ít nhất một ảnh trước và một ảnh sau |
| Thanh toán/bàn giao | Đúng tiếp nhận/admin; công việc ready; trạng thái thanh toán là boolean; đã thanh toán mới bàn giao |
| Đánh giá | Đúng khách, đã bàn giao, điểm 1–5, chỉ một đánh giá |

## Còn cần BA quyết định

- Nhân viên thuộc một hay nhiều gara; hiện tiếp nhận/admin thao tác toàn hệ thống.
- Đến sớm, trễ, không đến; khi nào nhả chỗ của lịch chưa xử lý.
- Có cho tiếp nhận/thực hiện sớm hơn ngày hẹn không; hiện chưa giới hạn theo ngày thực tế.
- Gara thay giờ làm/sức chứa/ngừng hoạt động khi đã có lịch xác nhận: xử lý lịch cũ thế nào.
- Đề xuất đổi giờ có giữ chỗ mới không, hết hạn khi nào; hiện giữ lịch cũ và kiểm tra lại lúc khách chấp nhận.
- Có công nợ, trả một phần, hoàn tiền và điều chỉnh sau bàn giao không; hiện ghi nhận đủ/chưa thanh toán.
- Khóa khách đang có lịch hoặc chờ duyệt phát sinh: quy trình xử lý thay thế thế nào.
- Có bắt buộc ảnh trước được tải trước thời điểm bắt đầu và ảnh sau sau khi xong checklist không; hiện bắt buộc đủ ảnh trước khi hoàn thành.

## Chưa kiểm chứng hết

- Native Android/iOS: camera, thư viện ảnh, bàn phím, quyền hệ điều hành, thông báo nền và toàn bộ nhánh lỗi.
- Mọi kiểu mất mạng/timeout giữa lúc server đã lưu nhưng client chưa nhận phản hồi.
- Hai thiết bị cùng sửa checklist/hồ sơ với dữ liệu cũ; chưa có optimistic version để phát hiện mọi xung đột.
- Cập nhật cấu hình/dịch vụ đồng thời với đặt lịch, nhiều server và kiểm thử tải.
- Test bảo mật chuyên sâu và khôi phục dữ liệu sau sự cố.

## Chạy lại

Backend test chạy cổng 3001: trong backend đặt `$env:TEST_API_URL='http://localhost:3001'`, chạy `npm run test:constraints`. Test tạo fixture riêng và tự dọn. Chỉ chạy với database phát triển.

UI: web cổng 8083, API tùy TEST_API_URL; trong mobile chạy `node tests/ui.cjs`. Đợt này dùng server thử 3001 vì backend 3000 của người dùng đang tắt. Không cần mở hai backend khi dùng app bình thường.
