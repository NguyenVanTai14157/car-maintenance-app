"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Form, Input, Popconfirm, Skeleton } from "antd";
import {
  LogoutOutlined,
  SaveOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { LoadError, PageHeading } from "@/components/common";
import { api, useData } from "@/lib/api";
import type { AdminUser } from "@/lib/types";
export default function Account() {
  const q = useData<AdminUser>("auth/session"),
    { message } = App.useApp(),
    router = useRouter(),
    [busy, B] = useState(false),
    [error, E] = useState(""),
    [passwordError, PE] = useState("");
  const [passwordForm] = Form.useForm();
  return (
    <>
      <PageHeading
        title="Tài khoản của tôi"
        description="Cập nhật thông tin quản trị viên và bảo vệ tài khoản của bạn."
      />
      <LoadError error={q.error} reload={q.reload} />
      {q.loading ? (
        <Skeleton active />
      ) : (
        q.data && (
          <div className="account-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Thông tin cá nhân</h2>
                  <p>Thông tin hiển thị trong không gian quản trị</p>
                </div>
              </div>
              <div className="panel-body">
                <Form
                  key={q.data.id}
                  layout="vertical"
                  requiredMark={false}
                  initialValues={{
                    name: q.data.name,
                    email: q.data.email,
                    phone: q.data.phone || "",
                  }}
                  onFinish={async (values) => {
                    B(true);
                    E("");
                    try {
                      await api("auth/profile", "POST", values);
                      message.success("Đã cập nhật thông tin cá nhân.");
                      q.reload();
                      router.refresh();
                    } catch (e) {
                      E((e as Error).message);
                    } finally {
                      B(false);
                    }
                  }}
                >
                  <Form.Item
                    name="name"
                    label="Họ và tên"
                    rules={[
                      {
                        required: true,
                        whitespace: true,
                        message: "Vui lòng nhập họ tên.",
                      },
                    ]}
                  >
                    <Input maxLength={100} placeholder="Ví dụ: Nguyễn Văn An" />
                  </Form.Item>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { required: true, message: "Vui lòng nhập email." },
                      { type: "email", message: "Email chưa hợp lệ." },
                    ]}
                  >
                    <Input placeholder="ban@example.com" />
                  </Form.Item>
                  <Form.Item name="phone" label="Số điện thoại">
                    <Input placeholder="Không bắt buộc" />
                  </Form.Item>
                  {error && (
                    <Alert
                      className="form-alert"
                      type="error"
                      showIcon
                      title={error}
                    />
                  )}
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={busy}
                  >
                    Lưu thông tin
                  </Button>
                </Form>
              </div>
            </section>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Đổi mật khẩu</h2>
                  <p>Các phiên đăng nhập khác sẽ kết thúc sau khi đổi</p>
                </div>
                <SafetyCertificateOutlined />
              </div>
              <div className="panel-body">
                <Form
                  form={passwordForm}
                  layout="vertical"
                  requiredMark={false}
                  onFinish={async (values) => {
                    B(true);
                    PE("");
                    try {
                      await api("auth/password", "POST", {
                        current: values.current,
                        password: values.password,
                      });
                      message.success(
                        "Đã đổi mật khẩu. Các phiên khác đã kết thúc.",
                      );
                      passwordForm.resetFields();
                    } catch (e) {
                      PE((e as Error).message);
                    } finally {
                      B(false);
                    }
                  }}
                >
                  <Form.Item
                    name="current"
                    label="Mật khẩu hiện tại"
                    rules={[
                      { required: true, message: "Nhập mật khẩu hiện tại." },
                    ]}
                  >
                    <Input.Password
                      autoComplete="current-password"
                      placeholder="Mật khẩu đang sử dụng"
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
                      autoComplete="new-password"
                      placeholder="Ít nhất 8 ký tự"
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
                      autoComplete="new-password"
                      placeholder="Nhập lại mật khẩu vừa đặt"
                    />
                  </Form.Item>
                  {passwordError && (
                    <Alert
                      className="form-alert"
                      type="error"
                      showIcon
                      title={passwordError}
                    />
                  )}
                  <Button htmlType="submit" loading={busy}>
                    Đổi mật khẩu
                  </Button>
                </Form>
              </div>
            </section>
          </div>
        )
      )}
      <div style={{ marginTop: 25 }}>
        <Popconfirm
          title="Đăng xuất khỏi web quản trị?"
          okText="Đăng xuất"
          cancelText="Hủy"
          onConfirm={async () => {
            try {
              await api("auth/logout", "POST", {});
              router.replace("/login");
              router.refresh();
            } catch (e) {
              message.error((e as Error).message);
            }
          }}
        >
          <Button danger icon={<LogoutOutlined />}>
            Đăng xuất
          </Button>
        </Popconfirm>
      </div>
    </>
  );
}
