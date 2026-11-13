"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Alert, Button, Form, Input } from "antd";
import { api } from "@/lib/api";
export function RecoveryForm({ reset = false }: { reset?: boolean }) {
  const [busy, B] = useState(false),
    [error, E] = useState(""),
    [success, S] = useState("");
  return (
    <div className="auth-small">
      <section className="auth-card">
        <Link href="/login" className="brand">
          <Image className="brand-mark" src="/company-logo.png" alt="" width={29} height={29} />
          Htsofttechcare<span className="brand-admin">ADMIN</span>
        </Link>
        <h1>{reset ? "Đặt lại mật khẩu" : "Quên mật khẩu?"}</h1>
        <p>
          {reset
            ? "Nhập mã khôi phục trong email và đặt mật khẩu mới. Mã chỉ dùng một lần, có hiệu lực 15 phút."
            : "Nhập email quản trị đã đăng ký để nhận hướng dẫn khôi phục tài khoản."}
        </p>
        <Form
          layout="vertical"
          requiredMark={false}
          onFinish={async (values) => {
            B(true);
            E("");
            S("");
            try {
              const r = await api<{ message: string }>(
                "auth/" + (reset ? "reset-password" : "forgot-password"),
                "POST",
                reset
                  ? { token: values.token, password: values.password }
                  : { email: values.email },
              );
              S(r.message);
            } catch (e) {
              E((e as Error).message);
            } finally {
              B(false);
            }
          }}
        >
          {reset ? (
            <>
              <Form.Item
                name="token"
                label="Mã khôi phục"
                rules={[{ required: true, message: "Nhập mã trong email." }]}
              >
                <Input
                  placeholder="Dán mã khôi phục"
                  autoComplete="one-time-code"
                />
              </Form.Item>
              <Form.Item
                name="password"
                label="Mật khẩu mới"
                rules={[
                  { required: true, message: "Nhập mật khẩu mới." },
                  { min: 8, message: "Cần ít nhất 8 ký tự." },
                ]}
              >
                <Input.Password
                  placeholder="Ít nhất 8 ký tự"
                  autoComplete="new-password"
                />
              </Form.Item>
              <Form.Item
                name="repeat"
                label="Nhập lại mật khẩu mới"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "Nhập lại mật khẩu mới." },
                  ({ getFieldValue }) => ({
                    validator: (_, value) =>
                      !value || getFieldValue("password") === value
                        ? Promise.resolve()
                        : Promise.reject(Error("Hai mật khẩu chưa khớp.")),
                  }),
                ]}
              >
                <Input.Password
                  placeholder="Nhập lại mật khẩu vừa đặt"
                  autoComplete="new-password"
                />
              </Form.Item>
            </>
          ) : (
            <Form.Item
              name="email"
              label="Email khôi phục"
              rules={[
                { required: true, message: "Vui lòng nhập email." },
                { type: "email", message: "Email chưa hợp lệ." },
              ]}
            >
              <Input placeholder="Ví dụ: ban@example.com" />
            </Form.Item>
          )}
          {error && (
            <Alert className="form-alert" type="error" title={error} showIcon />
          )}
          {success && (
            <Alert
              className="form-alert"
              type="success"
              title={success}
              showIcon
            />
          )}
          <Button block type="primary" htmlType="submit" loading={busy}>
            {reset ? "Đặt lại mật khẩu" : "Gửi hướng dẫn khôi phục"}
          </Button>
        </Form>
        {!reset && (
          <Link href="/reset-password" className="auth-back">
            Tôi đã có mã khôi phục →
          </Link>
        )}
        <Link href="/login" className="auth-back">
          ← Về đăng nhập
        </Link>
      </section>
    </div>
  );
}
