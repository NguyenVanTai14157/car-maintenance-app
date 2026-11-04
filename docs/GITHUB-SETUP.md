# Lưu bản bốn vai trò lên GitHub

Đây là bản lưu trữ AutoCare gồm bốn vai trò trước khi nghiệp vụ được thiết kế lại theo yêu cầu mentor (một vai trò). Mã nguồn và các tài liệu kiểm thử được giữ để tham khảo/tái sử dụng.

## Những file không đưa lên Git

- File .env, thông tin tài khoản mẫu local, khóa và chứng chỉ.
- node_modules, dist, cache Expo, log và database export.
- Ảnh chụp kiểm thử và hình BA gốc trong docs/test-results, docs/ba-review (có thể chứa dữ liệu riêng).
- .local-backups chứa lịch sử Git mobile cũ. Thư mục này chỉ ở máy hiện tại.

.env.example được giữ làm mẫu và không chứa mật khẩu thật. .gitignore chỉ bỏ qua file khỏi Git, không mã hóa file và không xóa bí mật khỏi một lịch sử đã được push. Repo gốc hiện được khởi tạo mới, chưa có commit hoặc remote.

## Tạo repo và push

Tạo repository trống trên GitHub; để trống lựa chọn khởi tạo README/.gitignore/license vì dự án đã có file local. Sau đó chạy tại thư mục gốc:

```powershell
cd D:\car-maintenance-app
git status
git add .
git diff --cached --stat
git commit -m "Archive AutoCare four-role version"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Thay URL bằng repo thực của bạn. Nếu Git yêu cầu tên/email commit hoặc GitHub yêu cầu đăng nhập thì nhập bằng tài khoản của bạn. Không chia sẻ token/mật khẩu trong chat.

## Khôi phục chạy trên máy khác

```powershell
cd backend
npm ci
Copy-Item .env.example .env
```

Tự điền DATABASE_URL, JWT_SECRET và DEMO_PASSWORD trong backend/.env. Tạo database PostgreSQL car_maintenance trước. Chạy `npm run seed` để tạo dữ liệu cơ bản, rồi `npm run dev`.

Terminal khác:

```powershell
cd mobile
npm ci
Copy-Item .env.example .env
npm start -- --lan
```

Nếu muốn có bộ chọn tài khoản test, bật EXPO_PUBLIC_DEMO_PASSWORD trong mobile/.env và đặt bằng DEMO_PASSWORD ở backend. Đây là cấu hình demo, giá trị EXPO_PUBLIC_ sẽ nhìn thấy trong bundle. Không dùng mật khẩu thật cho chế độ demo. Khởi động lại Expo sau khi đổi env.

Các tài liệu Markdown trong docs được giữ; ảnh minh chứng gốc không đi cùng repo, nên các đường dẫn ảnh local có thể không có trên máy mới.
