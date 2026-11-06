"use client";
import { Alert, Button, Empty, Tag } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
export function PageHeading({
  eyebrow = "KHÔNG GIAN QUẢN TRỊ",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function LoadError({
  error,
  reload,
}: {
  error?: string;
  reload: () => void;
}) {
  return error ? (
    <Alert
      showIcon
      type="error"
      title="Chưa tải được dữ liệu"
      description={error}
      action={
        <Button size="small" icon={<ReloadOutlined />} onClick={reload}>
          Thử lại
        </Button>
      }
      className="load-error"
    />
  ) : null;
}
export function Status({ active }: { active: boolean }) {
  return (
    <Tag color={active ? "success" : "default"} className="status-tag">
      <span className={"status-dot " + (active ? "active" : "")} />
      {active ? "Đang hoạt động" : "Đã khóa"}
    </Tag>
  );
}
export function CatalogStatus({ active }: { active: boolean }) {
  return (
    <Tag color={active ? "success" : "default"} className="status-tag">
      {active ? "Đang sử dụng" : "Ngừng sử dụng"}
    </Tag>
  );
}
export function EmptyData({ text = "Chưa có dữ liệu" }: { text?: string }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={text} />;
}
