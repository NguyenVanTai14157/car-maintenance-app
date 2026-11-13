"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { App, Avatar, Button, Dropdown, Drawer } from "antd";
import {
  AppstoreOutlined,
  TeamOutlined,
  CarOutlined,
  TrademarkOutlined,
  BranchesOutlined,
  PartitionOutlined,
  HistoryOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuOutlined,
  DownOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import type { AdminUser } from "@/lib/types";
import { api } from "@/lib/api";
const links = [
  { href: "/", label: "Tổng quan", icon: <AppstoreOutlined /> },
  { href: "/users", label: "Người dùng", icon: <TeamOutlined /> },
  { href: "/vehicles", label: "Danh sách xe", icon: <CarOutlined /> },
  { href: "/catalog/brands", label: "Hãng xe", icon: <TrademarkOutlined /> },
  { href: "/catalog/models", label: "Dòng xe", icon: <BranchesOutlined /> },
  { href: "/catalog/types", label: "Loại xe", icon: <PartitionOutlined /> },
  { href: "/audit-logs", label: "Nhật ký quản trị", icon: <HistoryOutlined /> },
];
export function Shell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: AdminUser;
}) {
  const path = usePathname(),
    router = useRouter(),
    { message } = App.useApp();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const expire = () => {
      router.replace("/login?expired=1");
      router.refresh();
    };
    window.addEventListener("autocare:session-expired", expire);
    return () => window.removeEventListener("autocare:session-expired", expire);
  }, [router]);
  async function logout() {
    setBusy(true);
    try {
      await api("auth/logout", "POST", {});
      router.replace("/login");
      router.refresh();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const nav = (
    <>
      <Link href="/" className="brand">
        <Image className="brand-mark" src="/company-logo.png" alt="" width={29} height={29} />
        Htsofttechcare<span className="brand-admin">ADMIN</span>
      </Link>
      <div className="nav-section-label">ĐIỀU HÀNH</div>
      <nav>
        {links.map((l, i) => (
          <div key={l.href}>
            {i === 3 && (
              <div className="nav-section-label catalog-label">
                DANH MỤC PHƯƠNG TIỆN
              </div>
            )}
            {i === 6 && <div className="nav-divider" />}
            <Link
              className={"nav-link " + (path === l.href ? "selected" : "")}
              href={l.href}
              onClick={() => setOpen(false)}
            >
              {l.icon}
              <span>{l.label}</span>
              {path === l.href && <span className="nav-active-dot" />}
            </Link>
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <Link
          className={"nav-link " + (path === "/account" ? "selected" : "")}
          href="/account"
        >
          <SettingOutlined />
          <span>Tài khoản của tôi</span>
        </Link>
        <button
          type="button"
          className="sidebar-user"
          onClick={() => router.push("/account")}
        >
          <Avatar style={{ background: "#d8e7bc", color: "#244b37" }}>
            {user.name.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <strong>{user.name}</strong>
            <small>Quản trị viên hệ thống</small>
          </div>
          <DownOutlined />
        </button>
      </div>
    </>
  );
  return (
    <div className="admin-layout">
      <aside className="sidebar">{nav}</aside>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        placement="left"
        size={270}
        className="mobile-nav"
        title="Điều hướng"
      >
        <div className="drawer-nav">{nav}</div>
      </Drawer>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <Button
              className="mobile-menu-button"
              type="text"
              aria-label="Mở menu"
              icon={<MenuOutlined />}
              onClick={() => setOpen(true)}
            />
            <span className="topbar-workspace">Không gian quản trị</span>
            <span className="topbar-separator">/</span>
            <strong>
              {path === "/account"
                ? "Tài khoản"
                : links.find((l) => l.href === path)?.label || "Htsofttechcare"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="admin-access">
              <SafetyCertificateOutlined /> Quyền quản trị
            </span>
            <Dropdown
              menu={{
                items: [
                  {
                    key: "account",
                    label: "Tài khoản của tôi",
                    icon: <SettingOutlined />,
                  },
                  { type: "divider" },
                  {
                    key: "logout",
                    label: "Đăng xuất",
                    icon: <LogoutOutlined />,
                    danger: true,
                    disabled: busy,
                  },
                ],
                onClick: ({ key }) =>
                  key === "logout" ? void logout() : router.push("/account"),
              }}
            >
              <Button type="text" className="account-button">
                <Avatar
                  size={30}
                  style={{ background: "#edf2e9", color: "#335b45" }}
                >
                  {user.name.charAt(0)}
                </Avatar>
                <span>{user.name}</span>
                <DownOutlined style={{ fontSize: 10 }} />
              </Button>
            </Dropdown>
          </div>
        </header>
        <main className="main-content">
          {children}
          <footer className="page-footer">
            <span>Htsofttechcare · Chăm xe chu đáo</span>
            <span>Quản trị hệ thống</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
