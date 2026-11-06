"use client";
import { Button, Result } from "antd";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <Result
      status="warning"
      title="Chưa tải được trang"
      subTitle="Kiểm tra backend đang chạy rồi thử lại. Dữ liệu của bạn vẫn được giữ nguyên."
      extra={
        <Button type="primary" onClick={reset}>
          Thử lại
        </Button>
      }
    />
  );
}
