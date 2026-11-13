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
          colorText: "#19322b",
          colorTextSecondary: "#4d6259",
          colorTextPlaceholder: "#596b62",
          colorBgLayout: "#f0f4f1",
          colorBorder: "#c8d7ce",
          borderRadius: 10,
          fontFamily: '"Segoe UI",Arial,sans-serif',
          controlHeight: 40,
        },
        components: {
          Table: {
            headerBg: "#edf3ef",
            headerColor: "#3b5248",
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
