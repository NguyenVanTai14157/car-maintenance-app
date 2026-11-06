"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Form, Input } from "antd";
import {
  ArrowRightOutlined,
  ArrowUpOutlined,
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  CarOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { api } from "@/lib/api";
export function LoginForm() {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="login-page">
      <section className="login-story">
        <Link href="/login" className="brand login-brand">
          <span className="brand-mark">
            <ArrowUpOutlined rotate={45} />
          </span>
          AutoCare<span className="brand-admin">ADMIN</span>
        </Link>
        <div className="login-story-main">
          <span className="login-eyebrow">
            CHĂM XE CHU ĐÁO · QUẢN TRỊ THÔNG MINH
          </span>
          <h1>
            Mọi dữ liệu,
            <br />
            một góc nhìn.
          </h1>
          <p>
            Quản lý người dùng và phương tiện trong một không gian rõ ràng, kết
            nối cùng AutoCare.
          </p>
          <div className="login-illustration" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="illustration-car">
              <CarOutlined />
            </span>
            <div className="illustration-label">
              <span>
                <CheckOutlined />
              </span>{" "}
              Kết nối những hành trình
            </div>
            <span className="orbit-dot dot-one" />
            <span className="orbit-dot dot-two" />
          </div>
        </div>
        <div className="login-story-footer">
          <span>↗</span> Vận hành gọn gàng. Chăm xe chu đáo.
        </div>
      </section>
      <section className="login-form-side">
        <div className="login-form-wrap">
          <div className="login-lock">
            <SafetyCertificateOutlined />
          </div>
          <div className="eyebrow">DÀNH CHO QUẢN TRỊ VIÊN</div>
          <h2>Chào mừng trở lại.</h2>
          <p className="login-description">
            Đăng nhập để tiếp tục quản lý hệ thống của bạn.
          </p>
          <Form
            layout="vertical"
            requiredMark={false}
            onFinish={async (values: {
              identifier: string;
              password: string;
            }) => {
              setBusy(true);
              setError("");
              try {
                await api("auth/login", "POST", values);
                router.replace("/");
                router.refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Form.Item
              name="identifier"
              label="Email quản trị"
              rules={[
                { required: true, message: "Vui lòng nhập email." },
                { type: "email", message: "Email chưa đúng định dạng." },
              ]}
            >
              <Input
                size="large"
                prefix={<MailOutlined />}
                placeholder="Nhập email của bạn"
                autoComplete="username"
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ required: true, message: "Vui lòng nhập mật khẩu." }]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
              />
            </Form.Item>
            <div className="login-forgot">
              <Link href="/forgot-password">Quên mật khẩu?</Link>
            </div>
            {error && (
              <Alert
                type="error"
                showIcon
                title={error}
                className="form-alert"
              />
            )}
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={busy}
            >
              Đăng nhập <ArrowRightOutlined />
            </Button>
          </Form>
          <div className="login-security">
            <SafetyCertificateOutlined />
            <span>Chỉ tài khoản được cấp quyền mới có thể truy cập.</span>
          </div>
        </div>
        <div className="login-bottom">
          AUTOCARE ADMIN <span>Chăm xe chu đáo · An tâm mỗi ngày</span>
        </div>
      </section>
    </div>
  );
}
