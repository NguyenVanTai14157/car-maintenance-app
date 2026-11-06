import "dotenv/config";
import { hash } from "bcryptjs";
import { migrate, transaction, db } from "../database/connection";
import { text, contact, password, fail } from "../common/validation/input";
export async function createFirstAdmin() {
  const c = contact({ email: process.env.ADMIN_EMAIL });
  if (!c.email) fail("Cấu hình ADMIN_EMAIL.");
  const name = text(
      process.env.ADMIN_NAME || "Quản trị AutoCare",
      "Họ tên",
      100,
    ),
    digest = await hash(password(process.env.ADMIN_PASSWORD), 12);
  await migrate();
  await transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(9098,0)");
    if (
      (
        await tx.query(
          "SELECT id FROM users WHERE role='admin' AND active=true LIMIT 1",
        )
      ).rowCount
    )
      fail(
        "Đã có admin hoạt động. Dùng API quản trị để thêm người quản trị khác.",
      );
    await tx.query(
      "INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'admin')",
      [name, c.email, digest],
    );
  });
  console.log(
    "Đã tạo admin đầu tiên. Thông tin đăng nhập không được ghi ra log.",
  );
}
if (require.main === module)
  createFirstAdmin()
    .catch((e) => {
      console.error(
        e.code === "23505"
          ? "Email đã được sử dụng; không tự nâng quyền tài khoản có sẵn."
          : e.message,
      );
      process.exitCode = 1;
    })
    .finally(() => db.end());
