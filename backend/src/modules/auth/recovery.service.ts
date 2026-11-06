import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import nodemailer from "nodemailer";
import { hash } from "bcryptjs";
import { fail, password, text } from "../../common/validation/input";
@Injectable()
export class RecoveryRepository {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  transaction<T>(fn: (c: any) => Promise<T>) {
    return this.db.transaction(fn);
  }
  async user(email: string, c: any) {
    return (
      await c.query(
        "SELECT id,email FROM users WHERE email=$1 AND active=true FOR UPDATE",
        [email],
      )
    ).rows[0];
  }
  async recent(id: number, c: any) {
    return (
      (
        await c.query(
          "SELECT id FROM password_resets WHERE user_id=$1 AND created_at>now()-interval '60 seconds'",
          [id],
        )
      ).rowCount > 0
    );
  }
  async issue(id: number, digest: string, c: any) {
    await c.query(
      "UPDATE password_resets SET used_at=now() WHERE user_id=$1 AND used_at IS NULL",
      [id],
    );
    await c.query(
      "INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '15 minutes')",
      [id, digest],
    );
  }
  async reset(digest: string, newPassword: string, c: any) {
    const candidate = (
      await c.query("SELECT user_id FROM password_resets WHERE token_hash=$1", [
        digest,
      ])
    ).rows[0];
    if (!candidate) fail("Mã khôi phục không hợp lệ hoặc đã hết hạn.");
    const user = (
      await c.query(
        "SELECT id FROM users WHERE id=$1 AND active=true FOR UPDATE",
        [candidate.user_id],
      )
    ).rows[0];
    if (!user) fail("Không thể khôi phục tài khoản.");
    const r = (
      await c.query(
        "SELECT * FROM password_resets WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE",
        [digest],
      )
    ).rows[0];
    if (!r) fail("Mã khôi phục không hợp lệ hoặc đã hết hạn.");
    await c.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
      newPassword,
      r.user_id,
    ]);
    await c.query("DELETE FROM sessions WHERE user_id=$1", [r.user_id]);
    await c.query(
      "UPDATE password_resets SET used_at=now() WHERE user_id=$1 AND used_at IS NULL",
      [r.user_id],
    );
  }
}
@Injectable()
export class RecoveryMailer {
  async send(email: string, token: string) {
    const content = `Bạn yêu cầu đặt lại mật khẩu AutoCare. Mã dùng một lần, hết hạn sau 15 phút:\n\n${token}\n\nNếu không yêu cầu, bạn có thể bỏ qua email này.`;
    if (
      process.env.MAIL_MODE === "preview" &&
      process.env.NODE_ENV !== "production"
    ) {
      const dir = resolve(__dirname, "../../../../.local-backups/mail-preview");
      await mkdir(dir, { recursive: true });
      await writeFile(
        resolve(dir, `${Date.now()}-${randomBytes(4).toString("hex")}.json`),
        JSON.stringify(
          {
            to: email,
            subject: "Khôi phục mật khẩu AutoCare",
            text: content,
            token,
          },
          null,
          2,
        ),
      );
      return;
    }
    if (!process.env.SMTP_HOST || !process.env.MAIL_FROM)
      throw new ServiceUnavailableException(
        "Dịch vụ email chưa được cấu hình. Vui lòng thử lại sau.",
      );
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
    await transport.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: "Khôi phục mật khẩu AutoCare",
      text: content,
    });
  }
}
@Injectable()
export class RecoveryService {
  private attempts = new Map<string, { count: number; until: number }>();
  constructor(
    @Inject(RecoveryRepository) private readonly repo: RecoveryRepository,
    @Inject(RecoveryMailer) private readonly mail: RecoveryMailer,
  ) {}
  private limit(ip: string) {
    const now = Date.now();
    for (const [k, v] of this.attempts)
      if (v.until < now) this.attempts.delete(k);
    const value = this.attempts.get(ip) || { count: 0, until: now + 900000 };
    if (++value.count > 20)
      fail("Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.");
    this.attempts.set(ip, value);
  }
  async forgot(ip: string, b: any) {
    this.limit(ip);
    const email = text(b.email, "Email", 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Email không hợp lệ.");
    const token = randomBytes(32).toString("hex");
    const target = await this.repo.transaction(async (c) => {
      const u = await this.repo.user(email, c);
      if (!u || (await this.repo.recent(u.id, c))) return null;
      await this.repo.issue(
        u.id,
        createHash("sha256").update(token).digest("hex"),
        c,
      );
      return u.email;
    });
    if (target) await this.mail.send(target, token);
    return {
      message:
        "Nếu email đã được đăng ký, hướng dẫn khôi phục sẽ được gửi đến email đó.",
    };
  }
  async reset(ip: string, b: any) {
    this.limit(ip);
    const token = text(b.token, "Mã khôi phục", 128);
    if (!/^[a-f0-9]{64}$/.test(token)) fail("Mã khôi phục không hợp lệ.");
    const digest = await hash(password(b.password), 12);
    await this.repo.transaction((c) =>
      this.repo.reset(
        createHash("sha256").update(token).digest("hex"),
        digest,
        c,
      ),
    );
    return {
      ok: true,
      message: "Đã đổi mật khẩu. Vui lòng đăng nhập lại trên các thiết bị.",
    };
  }
}
