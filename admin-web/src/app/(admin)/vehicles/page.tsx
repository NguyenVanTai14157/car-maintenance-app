"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Avatar,
  Button,
  Drawer,
  Image,
  Input,
  Pagination,
  Select,
  Spin,
  Table,
  Tag,
} from "antd";
import {
  CarOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { EmptyData, LoadError, PageHeading } from "@/components/common";
import { day, money, number, query, useData } from "@/lib/api";
import type { AdminUser, MaintenanceRecord, Page, Vehicle } from "@/lib/types";
function Vehicles() {
  const params = useSearchParams();
  const [search, S] = useState(""),
    [term, T] = useState(""),
    [owner, O] = useState<number | undefined>(
      params.get("owner_id") ? Number(params.get("owner_id")) : undefined,
    ),
    [ownerTerm, OT] = useState(""),
    [archived, A] = useState<string>(),
    [page, P] = useState(1),
    [size, Z] = useState(10),
    [detail, D] = useState<number | null>(null),
    [historyPage, HP] = useState(1);
  const q = useData<Page<Vehicle>>(
      "admin/vehicles?" +
        query({ q: term, owner_id: owner, archived, page, page_size: size }),
    ),
    owners = useData<Page<AdminUser>>(
      "admin/users?" + query({ q: ownerTerm, page_size: 30 }),
    ),
    v = useData<Vehicle>(detail ? "admin/vehicles/" + detail : null),
    history = useData<Page<MaintenanceRecord>>(
      detail
        ? "admin/vehicles/" +
            detail +
            "/records?" +
            query({ page: historyPage, page_size: 5 })
        : null,
    );
  const selectedOwner = useData<AdminUser>(
    owner ? "admin/users/" + owner : null,
  );
  return (
    <>
      <PageHeading
        title="Danh sách xe"
        description="Thông tin phương tiện, chủ sở hữu và lịch sử bảo dưỡng cá nhân."
        action={
          <Button icon={<ReloadOutlined />} onClick={q.reload}>
            Làm mới
          </Button>
        }
      />
      <LoadError error={q.error} reload={q.reload} />
      <section className="panel table-panel">
        <div className="table-toolbar">
          <Input
            className="search-field"
            prefix={<SearchOutlined />}
            placeholder="Tìm biển số, hãng xe, chủ sở hữu"
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
            aria-label="Lọc chủ sở hữu"
            style={{ minWidth: 210 }}
            value={owner}
            showSearch
            filterOption={false}
            allowClear
            placeholder="Tất cả chủ sở hữu"
            onSearch={OT}
            onChange={(value) => {
              O(value);
              P(1);
            }}
            options={[
              ...(selectedOwner.data &&
              !(owners.data?.items || []).some((u) => u.id === owner)
                ? [selectedOwner.data]
                : []),
              ...(owners.data?.items || []),
            ].map((u) => ({ value: u.id, label: u.name + " · " + u.email }))}
          />
          <Select
            aria-label="Lọc trạng thái xe"
            value={archived}
            allowClear
            placeholder="Tất cả trạng thái"
            options={[
              { label: "Đang sử dụng", value: "false" },
              { label: "Đã lưu trữ", value: "true" },
            ]}
            onChange={(value) => {
              A(value);
              P(1);
            }}
          />
          <span className="toolbar-tail table-count">
            {q.data?.total ?? "—"} phương tiện
          </span>
        </div>
        <Table<Vehicle>
          rowKey="id"
          loading={q.loading}
          dataSource={q.data?.items}
          scroll={{ x: 960 }}
          locale={{ emptyText: <EmptyData text="Chưa có xe phù hợp" /> }}
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
              title: "Phương tiện",
              render: (_, x) => (
                <div className="name-cell">
                  <span className="stat-icon">
                    <CarOutlined />
                  </span>
                  <div>
                    <strong>
                      {x.catalog_brand_name || x.brand}{" "}
                      {x.catalog_model_name || x.model}
                    </strong>
                    <small>
                      {x.type_name || "Chưa phân loại"} ·{" "}
                      {x.year || "Chưa có năm"}
                    </small>
                  </div>
                </div>
              ),
            },
            {
              title: "Biển số",
              dataIndex: "plate",
              render: (value) =>
                value ? (
                  <Tag className="role-tag">{value}</Tag>
                ) : (
                  <span className="muted">Chưa cung cấp</span>
                ),
            },
            {
              title: "Chủ sở hữu",
              render: (_, x) => (
                <div className="name-cell">
                  <div>
                    <strong>{x.owner_name}</strong>
                    <small>{x.owner_email}</small>
                  </div>
                </div>
              ),
            },
            {
              title: "Số km",
              dataIndex: "odometer",
              render: (value) => number(value) + " km",
            },
            {
              title: "Trạng thái",
              dataIndex: "archived",
              render: (value) => (
                <Tag
                  color={value ? "default" : "success"}
                  className="status-tag"
                >
                  {value ? "Đã lưu trữ" : "Đang sử dụng"}
                </Tag>
              ),
            },
            {
              title: "Chi tiết",
              width: 75,
              render: (_, x) => (
                <Button
                  type="text"
                  aria-label={"Xem xe " + (x.plate || x.id)}
                  icon={<EyeOutlined />}
                  onClick={() => {
                    D(x.id);
                    HP(1);
                  }}
                />
              ),
            },
          ]}
        />
        <div className="panel-footer">
          Quản trị viên chỉ xem thông tin. Người dùng tự quản lý xe và lịch sử
          bảo dưỡng trên ứng dụng.
        </div>
      </section>
      <Drawer
        open={!!detail}
        onClose={() => D(null)}
        title="Chi tiết phương tiện"
        size={550}
      >
        <LoadError error={v.error} reload={v.reload} />
        {v.loading ? (
          <Spin />
        ) : (
          v.data && (
            <>
              <div className="detail-avatar">
                <Avatar
                  size={54}
                  icon={<CarOutlined />}
                  style={{ background: "#e7efdd", color: "#63804b" }}
                />
                <div>
                  <h2>
                    {v.data.catalog_brand_name || v.data.brand}{" "}
                    {v.data.catalog_model_name || v.data.model}
                  </h2>
                  <p>{v.data.plate || "Chưa cung cấp biển số"}</p>
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-block">
                  <small>Số km hiện tại</small>
                  <strong>{number(v.data.odometer)} km</strong>
                </div>
                <div className="detail-block">
                  <small>Năm sản xuất</small>
                  <strong>{v.data.year || "—"}</strong>
                </div>
              </div>
              <div className="detail-label">Chủ sở hữu</div>
              <div className="detail-value">
                {v.data.owner_name}
                <br />
                <span className="muted">{v.data.owner_email}</span>
              </div>
              <div className="detail-label">Loại xe</div>
              <div className="detail-value">
                {v.data.type_name || "Chưa phân loại"}
              </div>
              <div className="detail-label">Ghi chú</div>
              <div className="detail-value">
                {v.data.notes || "Không có ghi chú"}
              </div>
              {v.data.image && (
                <Image
                  alt="Ảnh phương tiện"
                  src={v.data.image}
                  width="100%"
                  className="vehicle-photo"
                />
              )}
              <div className="detail-divider" />
              <h3 className="detail-title">Lịch sử bảo dưỡng</h3>
              <LoadError error={history.error} reload={history.reload} />
              {history.loading ? (
                <Spin />
              ) : history.data?.items.length ? (
                history.data.items.map((r) => (
                  <div key={r.id} className="record-entry">
                    <div className="record-entry-header">
                      <strong>{r.category_name}</strong>
                      <strong>{money(r.cost)}</strong>
                    </div>
                    <p className="muted">
                      {day(r.performed_date)} · {number(r.odometer)} km
                    </p>
                    <p>{r.content}</p>
                    {r.notes && <p className="muted">{r.notes}</p>}
                    <div className="record-photos">
                      {r.images.map((src, i) => (
                        <Image
                          key={i}
                          src={src}
                          alt={"Ảnh bảo dưỡng " + (i + 1)}
                          width={74}
                          height={74}
                          style={{ objectFit: "cover", borderRadius: 6 }}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyData text="Chưa có lịch sử bảo dưỡng" />
              )}
              {!!history.data?.total && history.data.total > 5 && (
                <Pagination
                  size="small"
                  current={historyPage}
                  pageSize={5}
                  total={history.data.total}
                  onChange={HP}
                />
              )}
            </>
          )
        )}
      </Drawer>
    </>
  );
}
export default function VehiclesPage() {
  return (
    <Suspense fallback={<Spin />}>
      <Vehicles />
    </Suspense>
  );
}
