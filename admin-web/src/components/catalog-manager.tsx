"use client";
import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Switch,
  Table,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  TrademarkOutlined,
  BranchesOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { CatalogStatus, EmptyData, LoadError, PageHeading } from "./common";
import { allCatalog, api, query, useData } from "@/lib/api";
import type { CatalogItem, CatalogKind, Page } from "@/lib/types";
const names = { brands: "Hãng xe", models: "Dòng xe", types: "Loại xe" };
interface Values {
  name: string;
  active: boolean;
  brand_id?: number;
  type_id?: number | null;
}
export function CatalogManager({ kind }: { kind: CatalogKind }) {
  const [search, S] = useState(""),
    [term, T] = useState(""),
    [active, A] = useState<string>(),
    [page, P] = useState(1),
    [size, Z] = useState(10),
    [editing, E] = useState<CatalogItem | null | undefined>(),
    [busy, B] = useState(false),
    [error, F] = useState(""),
    [brands, Brands] = useState<CatalogItem[]>([]),
    [types, Types] = useState<CatalogItem[]>([]);
  const [form] = Form.useForm<Values>(),
    { message } = App.useApp();
  const q = useData<Page<CatalogItem>>(
    "admin/catalog/" +
      kind +
      "?" +
      query({ q: term, active, page, page_size: size }),
  );
  async function open(item: CatalogItem | null) {
    E(item);
    F("");
    form.resetFields();
    form.setFieldsValue(
      item
        ? {
            name: item.name,
            active: item.active,
            brand_id: item.brand_id,
            type_id: item.type_id ?? undefined,
          }
        : { active: true },
    );
    if (kind === "models") {
      B(true);
      try {
        const [b, t] = await Promise.all([
          allCatalog("brands"),
          allCatalog("types"),
        ]);
        Brands(b);
        Types(t);
      } catch (e) {
        F((e as Error).message);
      } finally {
        B(false);
      }
    }
  }
  const icon =
    kind === "brands" ? (
      <TrademarkOutlined />
    ) : kind === "models" ? (
      <BranchesOutlined />
    ) : (
      <AppstoreOutlined />
    );
  return (
    <>
      <PageHeading
        eyebrow="DANH MỤC PHƯƠNG TIỆN"
        title={names[kind]}
        description={
          kind === "brands"
            ? "Chuẩn hóa thương hiệu phương tiện trên toàn hệ thống."
            : kind === "models"
              ? "Mỗi dòng xe thuộc một hãng và có loại xe tương ứng."
              : "Phân loại phương tiện như Sedan, SUV, Hatchback hoặc Bán tải."
        }
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => void open(null)}
          >
            Thêm {names[kind].toLowerCase()}
          </Button>
        }
      />
      <LoadError error={q.error} reload={q.reload} />
      <section className="panel table-panel">
        <div className="table-toolbar">
          <Input
            className="search-field"
            prefix={<SearchOutlined />}
            placeholder={"Tìm tên " + names[kind].toLowerCase()}
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
            aria-label="Lọc trạng thái danh mục"
            placeholder="Tất cả trạng thái"
            allowClear
            value={active}
            onChange={(v) => {
              A(v);
              P(1);
            }}
            options={[
              { label: "Đang sử dụng", value: "true" },
              { label: "Ngừng sử dụng", value: "false" },
            ]}
          />
          <span className="toolbar-tail table-count">
            {q.data?.total ?? "—"} {names[kind].toLowerCase()}
          </span>
          <Button
            aria-label="Làm mới danh mục"
            icon={<ReloadOutlined />}
            onClick={q.reload}
          />
        </div>
        <Table<CatalogItem>
          rowKey="id"
          dataSource={q.data?.items}
          loading={q.loading}
          scroll={{ x: kind === "models" ? 820 : 570 }}
          locale={{
            emptyText: (
              <EmptyData
                text={"Chưa có " + names[kind].toLowerCase() + " phù hợp"}
              />
            ),
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
            {
              title: names[kind],
              key: "name",
              render: (_, item) => (
                <div className="name-cell">
                  <span className="stat-icon">{icon}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>#{String(item.id).padStart(3, "0")}</small>
                  </div>
                </div>
              ),
            },
            ...(kind === "models"
              ? [
                  { title: "Hãng xe", dataIndex: "brand_name" },
                  {
                    title: "Loại xe",
                    dataIndex: "type_name",
                    render: (v: string | null) =>
                      v || <span className="muted">Chưa phân loại</span>,
                  },
                ]
              : []),
            {
              title: "Trạng thái",
              key: "active",
              render: (_, item) => (
                <>
                  <CatalogStatus active={item.active} />
                  {kind === "models" &&
                    (!item.brand_active || !item.type_active) && (
                      <div className="catalog-context">
                        Hãng / loại xe đang ngừng sử dụng
                      </div>
                    )}
                </>
              ),
            },
            {
              title: "Thao tác",
              width: 135,
              render: (_, item) => (
                <div className="action-buttons">
                  <Tooltip title="Chỉnh sửa">
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      aria-label={"Sửa " + item.name}
                      onClick={() => void open(item)}
                    />
                  </Tooltip>
                  <Popconfirm
                    title="Xóa danh mục này?"
                    description="Danh mục đã được dùng cần chuyển sang Ngừng sử dụng để giữ dữ liệu."
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    onConfirm={async () => {
                      try {
                        await api(
                          "admin/catalog/" + kind + "/" + item.id,
                          "DELETE",
                        );
                        message.success(
                          "Đã xóa " + names[kind].toLowerCase() + ".",
                        );
                        q.reload();
                      } catch (e) {
                        message.error((e as Error).message);
                      }
                    }}
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label={"Xóa " + item.name}
                    />
                  </Popconfirm>
                </div>
              ),
            },
          ]}
        />
        <div className="panel-footer">
          Danh mục đã có xe hoặc dữ liệu liên quan nên chuyển sang ngừng sử dụng
          thay vì xóa.
        </div>
      </section>
      <Modal
        open={editing !== undefined}
        title={(editing ? "Chỉnh sửa " : "Thêm ") + names[kind].toLowerCase()}
        onCancel={() => {
          if (!busy) E(undefined);
        }}
        okText="Lưu danh mục"
        cancelText="Hủy"
        confirmLoading={busy}
        onOk={() => form.submit()}
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
                "admin/catalog/" + kind + (editing ? "/" + editing.id : ""),
                editing ? "PATCH" : "POST",
                kind === "models"
                  ? { ...values, type_id: values.type_id ?? null }
                  : values,
              );
              message.success("Đã lưu " + names[kind].toLowerCase() + ".");
              E(undefined);
              q.reload();
            } catch (e) {
              F((e as Error).message);
            } finally {
              B(false);
            }
          }}
        >
          <Form.Item
            name="name"
            label={"Tên " + names[kind].toLowerCase()}
            rules={[
              {
                required: true,
                whitespace: true,
                message: "Vui lòng nhập tên.",
              },
            ]}
          >
            <Input
              maxLength={100}
              placeholder={
                kind === "brands"
                  ? "Ví dụ: Honda"
                  : kind === "models"
                    ? "Ví dụ: City"
                    : "Ví dụ: Sedan"
              }
            />
          </Form.Item>
          {kind === "models" && (
            <div className="form-two-columns">
              <Form.Item
                name="brand_id"
                label="Hãng xe"
                rules={[{ required: true, message: "Chọn hãng xe." }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Chọn hãng xe"
                  options={brands.map((b) => ({
                    value: b.id,
                    label: b.name + (b.active ? "" : " (ngừng sử dụng)"),
                    disabled: !b.active && b.id !== editing?.brand_id,
                  }))}
                />
              </Form.Item>
              <Form.Item name="type_id" label="Loại xe">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Chưa phân loại"
                  options={types.map((t) => ({
                    value: t.id,
                    label: t.name + (t.active ? "" : " (ngừng sử dụng)"),
                    disabled: !t.active && t.id !== editing?.type_id,
                  }))}
                />
              </Form.Item>
            </div>
          )}
          <Form.Item
            name="active"
            label="Cho phép người dùng chọn"
            valuePropName="checked"
          >
            <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
          </Form.Item>
          <div className="form-note">
            Ngừng sử dụng sẽ ẩn mục này khỏi danh sách chọn mới, đồng thời giữ
            thông tin xe và lịch sử hiện có.
          </div>
          {error && <Alert type="error" showIcon title={error} />}
        </Form>
      </Modal>
    </>
  );
}
