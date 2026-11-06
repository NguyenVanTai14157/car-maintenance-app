"use client";
import { App, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: "#1b5c49",
          colorInfo: "#1b5c49",
          colorSuccess: "#237a57",
          colorText: "#183c33",
          colorTextSecondary: "#718079",
          colorBgLayout: "#f5f7f4",
          colorBorder: "#dfe6df",
          borderRadius: 10,
          fontFamily: '"Segoe UI",Arial,sans-serif',
          controlHeight: 40,
        },
        components: {
          Table: {
            headerBg: "#f6f8f5",
            headerColor: "#6d7d73",
            headerSplitColor: "transparent",
            rowHoverBg: "#f5f9f4",
          },
          Button: { primaryShadow: "none" },
          Modal: { borderRadiusLG: 18 },
          Menu: { itemHeight: 46, itemBorderRadius: 9 },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
