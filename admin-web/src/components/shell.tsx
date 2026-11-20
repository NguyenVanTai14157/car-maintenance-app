"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, Button, Drawer } from "antd";
import {
  AppstoreOutlined,
  TeamOutlined,
  CarOutlined,
  PictureOutlined,
  HistoryOutlined,
  SettingOutlined,
  MenuOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import type { AdminUser } from "@/lib/types";
const links = [
  { href: "/", label: "Tổng quan", icon: <AppstoreOutlined /> },
  { href: "/users", label: "Người dùng", icon: <TeamOutlined /> },
  { href: "/vehicles", label: "Danh sách xe", icon: <CarOutlined /> },
  { href: "/banners", label: "Banner trang chủ", icon: <PictureOutlined /> },
  { href: "/audit-logs", label: "Nhật ký quản trị", icon: <HistoryOutlined /> },
  { href: "/system-logs", label: "Nhật ký hệ thống", icon: <HistoryOutlined /> },
];
export function Shell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: AdminUser;
}) {
  const path = usePathname(),
    router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let stream: EventSource | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let retryDelay = 3000;
    function connect() {
      if (stopped || document.hidden) return;
      stream?.close();
      stream = new EventSource("/api/admin/system-logs/events");
      stream.onopen = () => { retryDelay = 3000; };
      stream.onmessage = ({ data }) => {
        const resources: string[] = JSON.parse(data);
        if (resources.length)
          window.dispatchEvent(new CustomEvent("autocare:admin-changed", { detail: resources }));
      };
      stream.onerror = () => {
        stream?.close();
        clearTimeout(retry);
        retry = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
      };
    }
    const visibility = () => {
      clearTimeout(retry);
      if (document.hidden) stream?.close();
      else connect();
    };
    document.addEventListener("visibilitychange", visibility);
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      document.removeEventListener("visibilitychange", visibility);
      stream?.close();
    };
  }, []);
  useEffect(() => {
    const expire = () => {
      router.replace("/login?expired=1");
      router.refresh();
    };
    window.addEventListener("autocare:session-expired", expire);
    return () => window.removeEventListener("autocare:session-expired", expire);
  }, [router]);
  const nav = (
    <>
      <Link href="/" className="brand">
        <Image className="brand-mark" src="/company-logo.png" alt="" width={29} height={29} />
        <span className="brand-name">Htsofttechcare</span>
      </Link>
      <div className="nav-section-label">ĐIỀU HÀNH</div>
      <nav>
        {links.map((l, i) => (
          <div key={l.href}>
            {i === 3 && <div className="nav-divider" />}
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
          href="/account"
          className="sidebar-user"
          aria-label={`Tài khoản của ${user.name}`}
          aria-current={path === "/account" ? "page" : undefined}
          onClick={() => setOpen(false)}
        >
          <Avatar style={{ background: "#d8e7bc", color: "#244b37" }}>
            {user.name.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <strong>{user.name}</strong>
            <small>Quản trị viên hệ thống</small>
          </div>
          <SettingOutlined />
        </Link>
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
            <Link
              href="/account"
              className="account-button"
              aria-label={`Tài khoản của ${user.name}`}
              aria-current={path === "/account" ? "page" : undefined}
            >
              <Avatar size={30} style={{ background: "#edf2e9", color: "#335b45" }}>
                {user.name.charAt(0)}
              </Avatar>
              <span>{user.name}</span>
              <SettingOutlined style={{ fontSize: 12 }} />
            </Link>
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
