import React, { useState } from "react";
import {
  Screen,
  Card,
  Heading,
  Body,
  Chips,
  ErrorText,
  money,
} from "../components/ui";
import { useData } from "../hooks/data";
export default function Reports() {
  const q = useData("/reports");
  const [period, P] = useState("monthly");
  const d = q.data;
  return (
    <Screen
      title="Thống kê & doanh thu"
      subtitle="Doanh thu từ lịch đã bàn giao và đã thanh toán, theo giờ Việt Nam."
      allowed={["admin", "receptionist"]}
      refresh={q.reload}
    >
      <ErrorText text={q.error} />
      {d && (
        <>
          <Card>
            <Heading>{money(d.summary.revenue)}</Heading>
            <Body>Tổng doanh thu đã ghi nhận</Body>
            <Body>
              {d.summary.appointments} lịch hẹn · {d.summary.customers} khách ·{" "}
              {d.summary.vehicles} xe
            </Body>
          </Card>
          <Chips
            value={period}
            onChange={P}
            options={[
              { label: "Theo ngày", value: "daily" },
              { label: "Theo tháng", value: "monthly" },
              { label: "Theo năm", value: "yearly" },
            ]}
          />
          {d[period].map((v: any) => (
            <Card key={v.period}>
              <Heading>
                {v.period} · {money(v.revenue)}
              </Heading>
              <Body>{v.count} lượt bảo dưỡng</Body>
            </Card>
          ))}
          {!d[period].length && <Body>Chưa có doanh thu trong báo cáo.</Body>}
          <Card>
            <Heading>Dịch vụ phổ biến</Heading>
            {d.popular.map((v: any) => (
              <Body key={v.name}>
                {v.name}: {v.count} lượt
              </Body>
            ))}
            {!d.popular.length && <Body>Chưa có dịch vụ hoàn thành.</Body>}
          </Card>
        </>
      )}
    </Screen>
  );
}
