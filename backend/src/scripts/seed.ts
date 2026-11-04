import { hash } from "bcryptjs";
import "dotenv/config";
import { db, migrate, transaction } from "../database/connection";
async function main() {
  await migrate();
  if (!process.env.DEMO_PASSWORD) throw new Error("Set DEMO_PASSWORD in .env");
  const digest = await hash(process.env.DEMO_PASSWORD, 12);
  await transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(9050)");
    for (const [role, name] of [
      ["admin", "Quản trị AutoCare"],
      ["receptionist", "Lễ tân AutoCare"],
      ["technician", "Kỹ thuật viên AutoCare"],
      ["customer", "Khách hàng demo"],
    ])
      await c.query(
        "INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO NOTHING",
        [name, `${role}@gmail.com`, digest, role],
      );
    if (!(await c.query("SELECT id FROM garages LIMIT 1")).rowCount)
      await c.query(
        "INSERT INTO garages(name,address) VALUES('AutoCare Quận 1','12 Nguyễn Trãi, TP. Hồ Chí Minh'),('AutoCare Thủ Đức','25 Võ Văn Ngân, TP. Hồ Chí Minh')",
      );
    if (!(await c.query("SELECT id FROM services LIMIT 1")).rowCount) {
      for (const s of [
        {
          name: "Thay dầu động cơ",
          price: 650000,
          duration: 60,
          description: "Thay dầu và kiểm tra mức dầu theo thông số xe.",
          checklist: ["Kiểm tra rò rỉ", "Thay dầu", "Kiểm tra mức dầu"],
        },
        {
          name: "Kiểm tra phanh",
          price: 300000,
          duration: 60,
          description: "Kiểm tra má phanh, đĩa phanh và dầu phanh.",
          checklist: ["Kiểm tra má phanh", "Kiểm tra dầu phanh", "Thử phanh"],
        },
        {
          name: "Bảo dưỡng định kỳ",
          price: 1200000,
          duration: 120,
          description: "Kiểm tra tổng thể theo yêu cầu của khách.",
          checklist: [
            "Kiểm tra động cơ",
            "Kiểm tra lốp",
            "Kiểm tra điện",
            "Chạy kiểm tra",
          ],
        },
      ])
        await c.query(
          "INSERT INTO services(name,price,duration,description,checklist) VALUES($1,$2,$3,$4,$5)",
          [
            s.name,
            s.price,
            s.duration,
            s.description,
            JSON.stringify(s.checklist),
          ],
        );
    }
  });
  console.log(
    "Demo accounts, garages and services ready. Existing accounts preserved.",
  );
  await db.end();
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
