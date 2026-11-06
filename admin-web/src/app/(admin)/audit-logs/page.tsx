"use client";
import { useState } from "react";
import { Button, Drawer, Select, Table, Tag } from "antd";
import { EyeOutlined, ReloadOutlined } from "@ant-design/icons";
import { EmptyData, LoadError, PageHeading } from "@/components/common";
import { query, timestamp, useData } from "@/lib/api";
import type { AuditLog, Page } from "@/lib/types";
const actions: Record<string, string> = {
  "user.create": "Thêm người dùng",
  "user.update": "Cập nhật người dùng",
  "user.delete": "Xóa người dùng",
  "catalog.create": "Thêm danh mục",
  "catalog.update": "Cập nhật danh mục",
  "catalog.delete": "Xóa danh mục",
};
const entities: Record<string, string> = {
  users: "Người dùng",
  vehicle_brands: "Hãng xe",
  vehicle_models: "Dòng xe",
  vehicle_types: "Loại xe",
};
const fields: Record<string, string> = {
  name: "Họ tên",
  email: "Email",
  phone: "Số điện thoại",
  role: "Vai trò",
  active: "Trạng thái",
};
function stateText(value: { role?: string; active?: boolean }) {
  return [
    value.role
      ? value.role === "admin"
        ? "Quản trị viên"
        : "Người dùng"
      : null,
    value.active === undefined ? null : value.active ? "Hoạt động" : "Đã khóa",
  ]
    .filter(Boolean)
    .join(" · ");
}
export default function LogsPage() {
  const [action, A] = useState<string>(),
    [entity, E] = useState<string>(),
    [page, P] = useState(1),
    [size, Z] = useState(10),
    [detail, D] = useState<AuditLog | null>(null);
  const q = useData<Page<AuditLog>>(
    "admin/audit-logs?" + query({ action, entity, page, page_size: size }),
  );
  return (
    <>
      <PageHeading
        title="Nhật ký quản trị"
        description="Theo dõi các thay đổi tài khoản và danh mục trên toàn hệ thống."
        action={
          <Button icon={<ReloadOutlined />} onClick={q.reload}>
            Làm mới
          </Button>
        }
      />
      <LoadError error={q.error} reload={q.reload} />
      <section className="panel table-panel">
        <div className="table-toolbar">
          <Select
            style={{ width: 220 }}
            aria-label="Lọc thao tác"
            placeholder="Tất cả thao tác"
            allowClear
            value={action}
            onChange={(v) => {
              A(v);
              P(1);
            }}
            options={Object.entries(actions).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Select
            aria-label="Lọc đối tượng"
            placeholder="Tất cả đối tượng"
            allowClear
            value={entity}
            onChange={(v) => {
              E(v);
              P(1);
            }}
            options={Object.entries(entities).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <span className="toolbar-tail table-count">
            {q.data?.total ?? "—"} hoạt động
          </span>
        </div>
        <Table<AuditLog>
          rowKey="id"
          loading={q.loading}
          dataSource={q.data?.items}
          scroll={{ x: 800 }}
          locale={{
            emptyText: <EmptyData text="Chưa có hoạt động quản trị" />,
          }}
          pagination={{
            current: page,
            pageSize: size,
            total: q.data?.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            onChange: (p, s) => {
              P(p);
              Z(s);
            },
          }}
          columns={[
            { title: "Thời gian", dataIndex: "created_at", render: timestamp },
            {
              title: "Quản trị viên",
              dataIndex: "actor_name",
              render: (value) =>
                value || <span className="muted">Tài khoản đã xóa</span>,
            },
            {
              title: "Thao tác",
              dataIndex: "action",
              render: (value) => (
                <Tag
                  color={value.endsWith("delete") ? "volcano" : "green"}
                  className="role-tag"
                >
                  {actions[value] || "Hoạt động quản trị"}
                </Tag>
              ),
            },
            {
              title: "Đối tượng",
              render: (_, x) => (
                <span>
                  {entities[x.entity] || x.entity}{" "}
                  <span className="id-cell">#{x.target_id}</span>
                </span>
              ),
            },
            {
              title: "Chi tiết",
              width: 80,
              render: (_, x) => (
                <Button
                  type="text"
                  aria-label={"Xem nhật ký " + x.id}
                  icon={<EyeOutlined />}
                  onClick={() => D(x)}
                />
              ),
            },
          ]}
        />
        <div className="panel-footer">
          Nhật ký được lưu tự động và chỉ có thể xem.
        </div>
      </section>
      <Drawer
        open={!!detail}
        title="Chi tiết hoạt động"
        onClose={() => D(null)}
        size={430}
      >
        {detail && (
          <>
            <div className="detail-label">Thao tác</div>
            <div className="detail-value">
              {actions[detail.action] || detail.action}
            </div>
            <div className="detail-label">Thực hiện bởi</div>
            <div className="detail-value">
              {detail.actor_name || "Tài khoản đã xóa"}
            </div>
            <div className="detail-label">Thời điểm</div>
            <div className="detail-value">{timestamp(detail.created_at)}</div>
            <div className="detail-label">Đối tượng</div>
            <div className="detail-value">
              {entities[detail.entity] || detail.entity} #{detail.target_id}
            </div>
            {!!detail.details.fields?.length && (
              <>
                <div className="detail-label">Thông tin được thay đổi</div>
                <div className="detail-value">
                  {detail.details.fields.map((f) => fields[f] || f).join(", ")}
                </div>
              </>
            )}
            {detail.details.before && (
              <>
                <div className="detail-label">Trước thay đổi</div>
                <div className="detail-value">
                  {stateText(detail.details.before)}
                </div>
              </>
            )}
            {detail.details.after && (
              <>
                <div className="detail-label">Sau thay đổi</div>
                <div className="detail-value">
                  {stateText(detail.details.after)}
                </div>
              </>
            )}
            {detail.details.role && (
              <>
                <div className="detail-label">Vai trò tài khoản</div>
                <div className="detail-value">{stateText(detail.details)}</div>
              </>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
