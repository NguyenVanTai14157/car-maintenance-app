"use client";
import { useRef, useState } from "react";
import {
  App,
  Button,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import { EmptyData, LoadError, PageHeading } from "@/components/common";
import { api, useData } from "@/lib/api";
import type { HomeBanner } from "@/lib/types";

type Values = {
  title: string;
  action_text: string;
  target_path: HomeBanner["target_path"];
  position: number;
  active: boolean;
};
const targets = [
  { value: "/plans", label: "Lịch bảo dưỡng" },
  { value: "/record-edit", label: "Ghi nhận bảo dưỡng" },
  { value: "/vehicles", label: "Xe của tôi" },
];
const imageUrl = (path: string) =>
  "/api/banner-images/" + encodeURIComponent(path.split("/").pop() || "");

export default function BannersPage() {
  const [form] = Form.useForm<Values>();
  const { message, modal } = App.useApp();
  const q = useData<HomeBanner[]>("admin/banners");
  const [editing, E] = useState<HomeBanner | null | undefined>();
  const [imageData, I] = useState<string[]>([]);
  const [preview, P] = useState<string[]>([]);
  const [busy, B] = useState(false);

  function open(banner: HomeBanner | null) {
    E(banner);
    I([]);
    P(banner ? (banner.image_paths ?? [banner.image_path]).map(imageUrl) : []);
  }

  const [reading, setReading] = useState(false);
  const filePicker = useRef<HTMLInputElement>(null);

  async function selectImages(files: File[]) {
    if (!files.length) return;
    if (imageData.length + files.length > 8 || files.some((file) =>
      !/^image\/(jpeg|png)$/.test(file.type) || file.size > 2 * 1024 * 1024
    )) {
      message.error("Chọn tối đa 8 ảnh JPG hoặc PNG, mỗi ảnh tối đa 2 MB.");
      return;
    }
    setReading(true);
    try {
      const images = await Promise.all(files.map((file) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      })));
      const selected = [...imageData, ...images];
      I(selected);
      P(selected);
    } catch {
      message.error("Không đọc được ảnh đã chọn.");
    } finally {
      setReading(false);
    }
  }

  async function save() {
    try {
      const values = await form.validateFields();
      if (!editing && !imageData.length) {
        message.error("Chọn ảnh cho banner.");
        return;
      }
      B(true);
      await api(
        editing ? `admin/banners/${editing.id}` : "admin/banners",
        editing ? "PATCH" : "POST",
        { ...values, ...(imageData.length ? { images: imageData } : {}) },
      );
      message.success(editing ? "Đã cập nhật banner." : "Đã thêm banner.");
      E(undefined);
      q.reload();
    } catch (error) {
      if (error && typeof error === "object" && "errorFields" in error) return;
      message.error((error as Error).message || "Không thể lưu banner.");
    } finally {
      B(false);
    }
  }

  async function remove(banner: HomeBanner) {
    try {
      await api(`admin/banners/${banner.id}`, "DELETE");
      message.success("Đã xóa banner.");
      q.reload();
    } catch (error) {
      message.error((error as Error).message);
    }
  }

  async function toggle(banner: HomeBanner, active: boolean) {
    try {
      await api(`admin/banners/${banner.id}`, "PATCH", {
        title: banner.title,
        action_text: banner.action_text,
        target_path: banner.target_path,
        position: banner.position,
        active,
      });
      message.success(active ? "Đã bật banner." : "Đã ẩn banner.");
      q.reload();
    } catch (error) {
      message.error((error as Error).message);
    }
  }

  return (
    <>
      <PageHeading
        title="Banner trang chủ"
        description="Tải ảnh và sắp xếp các banner sẽ tự chuyển trên màn hình Trang chủ của ứng dụng."
        action={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={q.reload}>Làm mới</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => open(null)}>Thêm banner</Button>
          </Space>
        }
      />
      <LoadError error={q.error} reload={q.reload} />
      <section className="panel table-panel">
        <Table<HomeBanner>
          rowKey="id"
          loading={q.loading}
          dataSource={q.data || []}
          scroll={{ x: 900 }}
          locale={{ emptyText: <EmptyData text="Chưa có banner. Thêm ảnh để hiển thị trên trang chủ ứng dụng." /> }}
          pagination={false}
          columns={[
            {
              title: "ẢNH",
              dataIndex: "image_path",
              width: 230,
              render: (path: string, banner) => (
                <Image.PreviewGroup>
                  <Space wrap size={6}>
                    {(banner.image_paths ?? [path]).map((photo, index) => (
                      <Image
                        key={photo}
                        src={imageUrl(photo)}
                        alt={`Ảnh banner ${index + 1}`}
                        width={58}
                        height={44}
                        style={{ objectFit: "cover", borderRadius: 6 }}
                      />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              ),
            },
            {
              title: "NỘI DUNG",
              render: (_, banner) => <div><strong>{banner.title}</strong><div className="muted">Nút: {banner.action_text}</div></div>,
            },
            {
              title: "MÀN HÌNH MỞ",
              dataIndex: "target_path",
              render: (path: string) => targets.find((x) => x.value === path)?.label || path,
            },
            { title: "THỨ TỰ", dataIndex: "position", width: 90 },
            {
              title: "TRẠNG THÁI",
              width: 130,
              render: (_, banner) => <Space><Switch checked={banner.active} onChange={(checked) => toggle(banner, checked)} /><Tag color={banner.active ? "green" : "default"}>{banner.active ? "Đang hiển thị" : "Đã ẩn"}</Tag></Space>,
            },
            {
              title: "THAO TÁC",
              width: 110,
              render: (_, banner) => <Space>
                <Button type="text" aria-label="Sửa banner" icon={<EditOutlined />} onClick={() => open(banner)} />
                <Button
                  danger
                  type="text"
                  aria-label="Xóa banner"
                  icon={<DeleteOutlined />}
                  onClick={() => modal.confirm({
                    title: "Xóa banner này?",
                    content: <><p>{banner.title}</p>Ảnh sẽ bị xóa khỏi máy chủ.</>,
                    okText: "Xóa",
                    cancelText: "Hủy",
                    okButtonProps: { danger: true },
                    centered: true,
                    onOk: () => remove(banner),
                  })}
                />
              </Space>,
            },
          ]}
        />
        <div className="panel-footer">Ảnh JPG hoặc PNG, tối đa 2 MB. Banner đang hiển thị sẽ được đồng bộ về ứng dụng.</div>
      </section>
      {editing !== undefined && <Modal
        title={editing ? "Sửa banner" : "Thêm banner trang chủ"}
        open={editing !== undefined}
        onCancel={() => E(undefined)}
        onOk={save}
        confirmLoading={busy}
        okButtonProps={{ disabled: reading }}
        cancelButtonProps={{ disabled: reading || busy }}
        closable={!reading && !busy}
        mask={{ closable: !reading && !busy }}
        keyboard={!reading && !busy}
        okText="Lưu banner"
        cancelText="Hủy"
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          initialValues={editing
            ? {
                title: editing.title,
                action_text: editing.action_text,
                target_path: editing.target_path,
                position: editing.position,
                active: editing.active,
              }
            : { target_path: "/plans", position: (q.data?.length || 0) + 1, active: true }}
        >
          <Form.Item label="Tiêu đề" name="title" rules={[{ required: true, whitespace: true, message: "Nhập tiêu đề banner." }, { max: 100, message: "Tối đa 100 ký tự." }]}>
            <Input placeholder="Ví dụ: Đến lúc chăm xe?" maxLength={100} />
          </Form.Item>
          <Form.Item label="Nội dung nút" name="action_text" rules={[{ required: true, whitespace: true, message: "Nhập nội dung nút." }, { max: 60, message: "Tối đa 60 ký tự." }]}>
            <Input placeholder="Ví dụ: Xem lịch bảo dưỡng" maxLength={60} />
          </Form.Item>
          <Form.Item label="Khi chạm vào, mở" name="target_path" rules={[{ required: true }]}>
            <select className="native-form-select">
              {targets.map((target) => (
                <option key={target.value} value={target.value}>
                  {target.label}
                </option>
              ))}
            </select>
          </Form.Item>
          <Form.Item label="Ảnh banner" required>
            <Space orientation="vertical" size="middle">
              <Space wrap>
                {preview.map((src, index) => (
                  <Image key={index} src={src} alt={`Ảnh ${index + 1}`} width={110} height={72} style={{ objectFit: "cover" }} />
                ))}
              </Space>
              <input
                ref={filePicker}
                type="file"
                hidden
                aria-label="Chọn ảnh banner"
                accept="image/jpeg,image/png"
                multiple
                disabled={reading || busy}
                onChange={(event) => {
                  void selectImages(Array.from(event.currentTarget.files ?? []));
                  event.currentTarget.value = "";
                }}
              />
              <Button
                disabled={busy || imageData.length >= 8}
                loading={reading}
                onClick={() => filePicker.current?.click()}
              >
                {editing && !imageData.length ? "Chọn bộ ảnh thay thế" : "Thêm ảnh"}
              </Button>
              <span className="muted">
                {preview.length}/8 ảnh. Chọn nhiều ảnh cùng lúc hoặc thêm qua nhiều lượt. Mỗi ảnh JPG hoặc PNG tối đa 2 MB.
              </span>
            </Space>
          </Form.Item>
          <Space align="start" size="large">
            <Form.Item label="Thứ tự hiển thị" name="position" rules={[{ required: true }]}>
              <InputNumber min={0} max={1000} />
            </Form.Item>
            <Form.Item label="Hiển thị trên ứng dụng" name="active" valuePropName="checked">
              <Switch checkedChildren="Có" unCheckedChildren="Không" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>}
    </>
  );
}
