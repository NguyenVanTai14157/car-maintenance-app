"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Alert,
  App,
  Avatar,
  Button,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Switch,
  Table,
  Tag,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  LockOutlined,
  UnlockOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { EmptyData, LoadError, PageHeading, Status } from "@/components/common";
import { api, day, query, useData } from "@/lib/api";
import type { AdminUser, Page } from "@/lib/types";
interface UserValues {
  name: string;
  email: string;
  phone?: string;
  role: "user" | "admin";
  active: boolean;
  password?: string;
}
export default function UsersPage() {
  const [search, S] = useState(""),
    [term, T] = useState(""),
    [active, A] = useState<string>(),
    [role, R] = useState<string>(),
    [page, P] = useState(1),
    [size, Z] = useState(10),
    [editing, E] = useState<AdminUser | null | undefined>(),
    [detail, D] = useState<number | null>(null),
    [busy, B] = useState(false),
    [error, F] = useState("");
  const [form] = Form.useForm<UserValues>();
  const { message } = App.useApp();
  const self = useData<AdminUser>("auth/session");
  const q = useData<Page<AdminUser>>(
      "admin/users?" + query({ q: term, active, role, page, page_size: size }),
    ),
    person = useData<AdminUser>(detail ? "admin/users/" + detail : null);
  function open(user: AdminUser | null) {
    E(user);
    F("");
    form.resetFields();
    form.setFieldsValue(
      user
        ? {
            name: user.name,
            email: user.email,
            phone: user.phone || "",
            role: user.role,
            active: user.active,
          }
        : { role: "user", active: true },
    );
  }
  async function change(user: AdminUser, body: Partial<UserValues>) {
    try {
      await api("admin/users/" + user.id, "PATCH", body);
      message.success(
        body.active === false ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.",
      );
      q.reload();
    } catch (e) {
      message.error((e as Error).message);
    }
  }
  return (
    <>
      <PageHeading
        title="Quản lý người dùng"
        description="Quản lý tài khoản, thông tin cá nhân và quyền truy cập hệ thống."
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => open(null)}
          >
            Thêm người dùng
          </Button>
        }
      />
      <LoadError error={q.error} reload={q.reload} />
      <section className="panel table-panel">
        <div className="table-toolbar">
          <Input
            className="search-field"
            prefix={<SearchOutlined />}
            placeholder="Tìm tên, email hoặc số điện thoại"
            value={search}
            allowClear
            onChange={(e) => {
              S(e.target.value);
              if (!e.target.value) {
                T("");
                P(1);
              }
            }}
            onPressEnter={() => {
              T(search);
              P(1);
            }}
            suffix={
              <Button
                type="text"
                size="small"
                onClick={() => {
                  T(search);
                  P(1);
                }}
              >
                Tìm
              </Button>
            }
          />
          <Select
            aria-label="Lọc trạng thái người dùng"
            placeholder="Tất cả trạng thái"
            value={active}
            allowClear
            onChange={(v) => {
              A(v);
              P(1);
            }}
            options={[
              { label: "Đang hoạt động", value: "true" },
              { label: "Đã khóa", value: "false" },
            ]}
          />
          <Select
            aria-label="Lọc vai trò"
            placeholder="Tất cả vai trò"
            value={role}
            allowClear
            onChange={(v) => {
              R(v);
              P(1);
            }}
            options={[
              { label: "Người dùng", value: "user" },
              { label: "Quản trị viên", value: "admin" },
            ]}
          />
          <span className="toolbar-tail table-count">
            {q.data?.total ?? "—"} tài khoản
          </span>
          <Button
            aria-label="Làm mới danh sách"
            icon={<ReloadOutlined />}
            onClick={q.reload}
          />
        </div>
        <Table<AdminUser>
          rowKey="id"
          loading={q.loading}
          dataSource={q.data?.items}
          scroll={{ x: 940 }}
          locale={{
            emptyText: <EmptyData text="Chưa có người dùng phù hợp" />,
          }}
          pagination={{
            current: page,
            pageSize: size,
            total: q.data?.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (t) => `${t} tài khoản`,
            onChange: (p, s) => {
              P(p);
              Z(s);
            },
          }}
          columns={[
            {
              title: "Người dùng",
              key: "name",
              render: (_, u) => (
                <div className="name-cell">
                  <Avatar
                    style={{
                      background: u.role === "admin" ? "#e5ecd8" : "#edf1e8",
                      color: "#5b7951",
                    }}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <div>
                    <strong>{u.name}</strong>
                    <small>{u.email}</small>
                  </div>
                </div>
              ),
            },
            {
              title: "Số điện thoại",
              dataIndex: "phone",
              render: (v) => v || <span className="muted">Chưa cung cấp</span>,
            },
            {
              title: "Vai trò",
              dataIndex: "role",
              render: (v) => (
                <Tag
                  color={v === "admin" ? "olive" : "default"}
                  className="role-tag"
                >
                  {v === "admin" ? "Quản trị viên" : "Người dùng"}
                </Tag>
              ),
            },
            {
              title: "Trạng thái",
              dataIndex: "active",
              render: (v) => <Status active={v} />,
            },
            { title: "Số xe", dataIndex: "vehicle_count", width: 78 },
            { title: "Ngày tạo", dataIndex: "created_at", render: day },
            {
              title: "Thao tác",
              width: 166,
              render: (_, u) => (
                <div className="action-buttons">
                  <Tooltip title="Xem chi tiết">
                    <Button
                      type="text"
                      aria-label={"Xem " + u.email}
                      icon={<EyeOutlined />}
                      onClick={() => D(u.id)}
                    />
                  </Tooltip>
                  <Tooltip title="Chỉnh sửa">
                    <Button
                      type="text"
                      aria-label={"Sửa " + u.email}
                      icon={<EditOutlined />}
                      onClick={() => open(u)}
                    />
                  </Tooltip>
                  <Popconfirm
                    title={
                      u.active
                        ? "Khóa tài khoản này?"
                        : "Mở khóa tài khoản này?"
                    }
                    description={
                      u.active
                        ? "Các phiên đăng nhập hiện tại sẽ kết thúc."
                        : "Người dùng có thể đăng nhập lại sau khi mở khóa."
                    }
                    onConfirm={() => change(u, { active: !u.active })}
                    disabled={u.id === self.data?.id}
                    okText="Xác nhận"
                    cancelText="Hủy"
                  >
                    <Button
                      type="text"
                      disabled={u.id === self.data?.id}
                      aria-label={(u.active ? "Khóa " : "Mở khóa ") + u.email}
                      icon={u.active ? <LockOutlined /> : <UnlockOutlined />}
                    />
                  </Popconfirm>
                  <Popconfirm
                    title="Xóa người dùng?"
                    description="Chỉ xóa tài khoản chưa có xe hoặc lịch sử. Tài khoản có dữ liệu cần dùng Khóa."
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    onConfirm={async () => {
                      try {
                        await api("admin/users/" + u.id, "DELETE");
                        message.success("Đã xóa người dùng.");
                        q.reload();
                      } catch (e) {
                        message.error((e as Error).message);
                      }
                    }}
                    disabled={u.id === self.data?.id}
                  >
                    <Button
                      type="text"
                      danger
                      disabled={u.id === self.data?.id}
                      aria-label={"Xóa " + u.email}
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>
                </div>
              ),
            },
          ]}
        />
      </section>
      <Modal
        title={editing ? "Chỉnh sửa người dùng" : "Thêm người dùng"}
        open={editing !== undefined}
        onCancel={() => {
          if (!busy) E(undefined);
        }}
        onOk={() => form.submit()}
        confirmLoading={busy}
        okText={editing ? "Lưu thay đổi" : "Tạo tài khoản"}
        cancelText="Hủy"
        width={550}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          className="modal-form"
          onFinish={async (values) => {
            B(true);
            F("");
            try {
              await api(
                "admin/users" + (editing ? "/" + editing.id : ""),
                editing ? "PATCH" : "POST",
                values,
              );
              message.success(
                editing ? "Đã cập nhật người dùng." : "Đã tạo người dùng.",
              );
              E(undefined);
              q.reload();
            } catch (e) {
              F((e as Error).message);
            } finally {
              B(false);
            }
          }}
        >
          <div className="form-note">
            {editing
              ? "Thông tin thay đổi được lưu vào tài khoản của người dùng. Đổi email, quyền hoặc trạng thái sẽ yêu cầu họ đăng nhập lại."
              : "Tài khoản được tạo có thể đăng nhập ứng dụng AutoCare. Mật khẩu ban đầu cần ít nhất 8 ký tự."}
          </div>
          <Form.Item
            name="name"
            label="Họ và tên"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "Vui lòng nhập họ và tên.",
              },
            ]}
          >
            <Input placeholder="Ví dụ: Nguyễn Văn An" maxLength={100} />
          </Form.Item>
          <div className="form-two-columns">
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Vui lòng nhập email." },
                { type: "email", message: "Email chưa đúng định dạng." },
              ]}
            >
              <Input placeholder="Ví dụ: ban@example.com" />
            </Form.Item>
            <Form.Item
              name="phone"
              label="Số điện thoại"
              rules={[
                {
                  pattern: /^\+?[\d\s.-]{9,20}$/,
                  message: "Số điện thoại chưa hợp lệ.",
                },
              ]}
            >
              <Input placeholder="Không bắt buộc" />
            </Form.Item>
          </div>
          {!editing && (
            <Form.Item
              name="password"
              label="Mật khẩu ban đầu"
              rules={[
                { required: true, message: "Vui lòng nhập mật khẩu." },
                { min: 8, message: "Mật khẩu cần ít nhất 8 ký tự." },
              ]}
            >
              <Input.Password
                autoComplete="new-password"
                placeholder="Ít nhất 8 ký tự"
              />
            </Form.Item>
          )}
          <div className="form-two-columns">
            <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
              <Select
                disabled={editing?.id === self.data?.id}
                options={[
                  { label: "Người dùng cá nhân", value: "user" },
                  { label: "Quản trị viên", value: "admin" },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="active"
              label="Cho phép đăng nhập"
              valuePropName="checked"
            >
              <Switch
                disabled={editing?.id === self.data?.id}
                checkedChildren="Bật"
                unCheckedChildren="Tắt"
              />
            </Form.Item>
          </div>
          {error && <Alert type="error" showIcon title={error} />}
        </Form>
      </Modal>
      <Drawer
        open={!!detail}
        onClose={() => D(null)}
        title="Chi tiết người dùng"
        size={450}
      >
        <LoadError error={person.error} reload={person.reload} />
        {person.data && (
          <>
            <div className="detail-avatar">
              <Avatar
                size={54}
                icon={<TeamOutlined />}
                style={{ background: "#e7efdd", color: "#63804b" }}
              />
              <div>
                <h2>{person.data.name}</h2>
                <p>{person.data.email}</p>
              </div>
            </div>
            <Status active={person.data.active} />
            <div className="detail-grid">
              {[
                ["Xe cá nhân", person.data.vehicles],
                ["Lịch bảo dưỡng", person.data.plans],
                ["Lần bảo dưỡng", person.data.records],
              ].map(([label, value]) => (
                <div className="detail-block" key={String(label)}>
                  <small>{label}</small>
                  <strong>{value ?? 0}</strong>
                </div>
              ))}
            </div>
            <div className="detail-label">Số điện thoại</div>
            <div className="detail-value">
              {person.data.phone || "Chưa cung cấp"}
            </div>
            <div className="detail-label">Vai trò</div>
            <div className="detail-value">
              {person.data.role === "admin"
                ? "Quản trị viên"
                : "Người dùng cá nhân"}
            </div>
            <div className="detail-label">Ngày tham gia</div>
            <div className="detail-value">{day(person.data.created_at)}</div>
            <Link href={"/vehicles?owner_id=" + person.data.id}>
              <Button block type="primary">
                Xem xe của người dùng
              </Button>
            </Link>
          </>
        )}
      </Drawer>
    </>
  );
}
