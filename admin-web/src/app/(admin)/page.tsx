"use client";
import Link from "next/link";
import { Button, Skeleton } from "antd";
import {
  ArrowRightOutlined,
  TeamOutlined,
  CarOutlined,
  TrademarkOutlined,
  BranchesOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { LoadError, PageHeading, EmptyData } from "@/components/common";
import { number, useData } from "@/lib/api";
import type { Dashboard } from "@/lib/types";
export default function DashboardPage() {
  const q = useData<Dashboard>("admin/dashboard"),
    d = q.data;
  const active = d?.active_users || 0,
    locked = (d?.users || 0) - active,
    portion = d?.users ? active / d.users : 0;
  return (
    <>
      <PageHeading
        title="Tổng quan hệ thống"
        description="Một góc nhìn rõ ràng về người dùng và phương tiện trên Htsofttechcare."
        action={
          <Button
            icon={<ReloadOutlined />}
            onClick={q.reload}
            loading={q.loading}
          >
            Làm mới
          </Button>
        }
      />
      <LoadError error={q.error} reload={q.reload} />
      <div className="welcome-banner">
        <div>
          <div className="eyebrow">KẾT NỐI NHỮNG HÀNH TRÌNH</div>
          <h2>Chăm xe chu đáo, bắt đầu từ dữ liệu tốt.</h2>
          <p>
            Quản lý tài khoản và chuẩn hóa danh mục phương tiện,
            <br />
            để mỗi hành trình cùng Htsofttechcare thêm an tâm.
          </p>
        </div>
        <Link href="/users">
          <Button icon={<ArrowRightOutlined />}>Quản lý người dùng</Button>
        </Link>
        <CarOutlined className="welcome-illustration" />
      </div>
      <div className="stats-grid">
        {[
          {
            label: "Tổng người dùng",
            value: d?.users,
            caption: `${number(active)} tài khoản đang hoạt động`,
            icon: <TeamOutlined />,
            featured: true,
          },
          {
            label: "Phương tiện",
            value: d?.vehicles,
            caption: `${number(d?.archived_vehicles || 0)} xe đang lưu trữ`,
            icon: <CarOutlined />,
          },
          {
            label: "Hãng xe",
            value: d?.active_brands,
            caption: "Danh mục đang sử dụng",
            icon: <TrademarkOutlined />,
          },
          {
            label: "Dòng xe",
            value: d?.active_models,
            caption: `Thuộc ${number(d?.active_types || 0)} loại xe`,
            icon: <BranchesOutlined />,
          },
        ].map((s) => (
          <div
            className={"stat-card " + (s.featured ? "featured" : "")}
            key={s.label}
          >
            <div className="stat-top">
              <span>{s.label}</span>
              <span className="stat-icon">{s.icon}</span>
            </div>
            <div className="stat-value">
              {s.value === undefined ? (
                <Skeleton.Input active size="small" style={{ width: 80 }} />
              ) : (
                number(s.value)
              )}
            </div>
            <div className="stat-caption">{s.caption}</div>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Hãng xe phổ biến</h2>
              <p>Phân bố phương tiện theo hãng xe đã ghi nhận</p>
            </div>
            <Link className="muted" href="/vehicles">
              Xem tất cả
            </Link>
          </div>
          <div className="panel-body">
            {q.loading ? (
              <Skeleton active />
            ) : d?.top_brands.length ? (
              <div className="brand-chart">
                {d.top_brands.map((b) => (
                  <div className="brand-chart-row" key={b.name}>
                    <strong>{b.name}</strong>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${(100 * b.vehicles) / d.top_brands[0].vehicles}%`,
                        }}
                      />
                    </div>
                    <span className="brand-chart-value">
                      {number(b.vehicles)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyData text="Chưa có phương tiện để thống kê" />
            )}
            <div className="legend-note">
              <i />
              Số lượng xe trên toàn hệ thống
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Trạng thái người dùng</h2>
              <p>Theo tình trạng hoạt động của tài khoản</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="donut-area">
              <div className="donut">
                <svg
                  viewBox="0 0 120 120"
                  aria-label="Tỷ lệ tài khoản đang hoạt động"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="#edf1e7"
                    strokeWidth="12"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="#2c6248"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${portion * 301.59} 301.59`}
                  />
                </svg>
                <div className="donut-center">
                  <strong>{number(d?.users || 0)}</strong>
                  <small>người dùng</small>
                </div>
              </div>
            </div>
            <div className="donut-legend">
              <div>
                <span className="legend-dot" />
                Hoạt động<strong>{number(active)}</strong>
              </div>
              <div>
                <span className="legend-dot gray" />
                Đã khóa<strong>{number(locked)}</strong>
              </div>
            </div>
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Truy cập nhanh</h2>
            <p>Những công việc thường xuyên của quản trị viên</p>
          </div>
        </div>
        <div className="quick-links">
          {[
            {
              href: "/users",
              title: "Quản lý người dùng",
              description: "Tài khoản và quyền truy cập",
              icon: <TeamOutlined />,
            },
            {
              href: "/vehicles",
              title: "Theo dõi phương tiện",
              description: "Thông tin xe và chủ sở hữu",
              icon: <CarOutlined />,
            },
            {
              href: "/catalog/brands",
              title: "Chuẩn hóa danh mục",
              description: "Hãng, dòng và loại xe",
              icon: <TrademarkOutlined />,
            },
          ].map((l) => (
            <Link href={l.href} className="quick-link" key={l.href}>
              {l.icon}
              <div>
                <strong>{l.title}</strong>
                <small>{l.description}</small>
              </div>
              <ArrowRightOutlined className="quick-arrow" />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
