"use client";

import { useState } from "react";
import { Button, Input, Select, Table, Tabs, Tag, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { EmptyData, LoadError, PageHeading } from "@/components/common";
import { query, timestamp, useData } from "@/lib/api";
import type { Page } from "@/lib/types";

interface SystemLog {
  id: string;
  created_at: string;
  request_id: string;
  actor_id: number | null;
  actor_email: string | null;
  method: string;
  endpoint: string;
  resource_id: string | null;
  status: number;
  duration_ms: number;
  error_code: string | null;
  error_reason: string | null;
}

const resources: Record<string, string> = {
  vehicles: "xe",
  plans: "lịch bảo dưỡng",
  records: "lần bảo dưỡng",
  categories: "hạng mục",
  settings: "cài đặt",
  backup: "bản sao lưu",
  notifications: "thông báo",
};

function actionLabel(log: SystemLog) {
  if (log.endpoint === "/backup/restore") return "Khôi phục dữ liệu";
  if (log.endpoint === "/notifications/read") return "Đánh dấu đã đọc thông báo";
  if (log.endpoint.endsWith("/archive")) return "Đổi trạng thái lưu trữ xe";
  if (log.endpoint.endsWith("/cancel")) return "Hủy lịch bảo dưỡng";
  const verb = log.method === "DELETE" ? "Xóa" : log.method === "POST" ? "Tạo" : "Cập nhật";
  return verb + " " + (resources[log.endpoint.split("/")[1]] ?? "dữ liệu");
}

export default function SystemLogsPage() {
  const [kind, setKind] = useState("activity");
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<number>();
  const [page, setPage] = useState(1);
  const logs = useData<Page<SystemLog>>(
    "admin/system-logs?" + query({ kind, q: term, status, page }),
  );

  return (
    <>
      <PageHeading
        title="Nhật ký hệ thống"
        description="Tra cứu thao tác trên ứng dụng và lỗi do API trả về."
        action={<Button icon={<ReloadOutlined />} onClick={logs.reload}>Làm mới</Button>}
      />
      <LoadError error={logs.error} reload={logs.reload} />
      <Tabs
        activeKey={kind}
        items={[
          { key: "activity", label: "Hoạt động người dùng" },
          { key: "error", label: "Lỗi API" },
        ]}
        onChange={(key) => {
          setKind(key);
          setStatus(undefined);
          setPage(1);
        }}
      />
      <section className="panel table-panel">
        <div className="table-toolbar">
          <Input.Search
            aria-label="Tìm nhật ký"
            className="search-field"
            placeholder="Email, API, mã yêu cầu…"
            allowClear
            maxLength={120}
            onSearch={(value) => {
              setTerm(value);
              setPage(1);
            }}
          />
          {kind === "error" && (
            <Select
              aria-label="Mã HTTP"
              placeholder="Mã HTTP"
              style={{ minWidth: 135 }}
              value={status}
              allowClear
              options={[400, 401, 403, 404, 409, 413, 429, 500, 502, 503].map(
                (value) => ({ value, label: String(value) }),
              )}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            />
          )}
        </div>
        <Table<SystemLog>
          rowKey="id"
          loading={logs.loading}
          dataSource={logs.data?.items}
          scroll={{ x: 1050 }}
          locale={{ emptyText: <EmptyData text="Chưa có nhật ký phù hợp" /> }}
          pagination={{
            current: page,
            pageSize: 20,
            total: logs.data?.total,
            showSizeChanger: false,
            onChange: setPage,
          }}
          columns={[
            { title: "Thời gian", dataIndex: "created_at", render: timestamp },
            {
              title: "Tài khoản",
              render: (_, log) => log.actor_email ?? (log.actor_id ? `Tài khoản #${log.actor_id}` : "Chưa xác định"),
            },
            {
              title: kind === "activity" ? "Thao tác" : "Mã lỗi",
              render: (_, log) => kind === "activity" ? actionLabel(log) : (
                <>
                  <div>{log.error_code ?? `HTTP_${log.status}`}</div>
                  {log.error_reason && <div className="muted">{log.error_reason}</div>}
                </>
              ),
            },
            {
              title: "API",
              render: (_, log) => (
                <>
                  <div>{log.method} {log.endpoint}</div>
                  {log.resource_id && <div className="muted">ID dữ liệu {log.resource_id}</div>}
                </>
              ),
            },
            {
              title: "HTTP",
              render: (_, log) => <Tag color={log.status >= 400 ? "red" : "green"}>{log.status}</Tag>,
            },
            { title: "Thời lượng", dataIndex: "duration_ms", render: (ms: number) => `${ms} ms` },
            {
              title: "Mã yêu cầu",
              dataIndex: "request_id",
              render: (id: string) => <Typography.Text copyable={{ text: id }}>{id.slice(0, 8)}…</Typography.Text>,
            },
          ]}
        />
      </section>
    </>
  );
}
