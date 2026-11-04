import React, { useEffect } from "react";
import { syncReminders, enableReminders } from "../services/reminders";
import { View, Text, Pressable } from "react-native";
import {
  Screen,
  Card,
  Body,
  Heading,
  go,
  s,
  roles,
  Badge,
  date,
  ErrorText,
  Button,
  Feedback,
  useSubmit,
} from "../components/ui";
import { useSession } from "../hooks/session";
import { useData } from "../hooks/data";
import {useRealtimeConnected} from '../services/realtime';
export default function Home() {
  const connected=useRealtimeConnected();
  const { user } = useSession();
  const q = useData("/appointments");
  const list = q.data || [];
  const task = useSubmit();
  useEffect(() => {
    if (user?.role === "customer" && q.data)
      void syncReminders(q.data, user.id).catch(() => {});
  }, [q.data, user]);
  const active = list.filter(
    (a: any) => !["completed", "cancelled", "rejected"].includes(a.status),
  );
  const menu: any = {
    customer: [
      ["🚘", "Xe của tôi", "/vehicles"],
      ["＋", "Đặt lịch", "/book"],
      ["▤", "Dịch vụ & giá", "/services"],
      ["◷", "Lịch hẹn & lịch sử", "/appointments"],
    ],
    receptionist: [
      ["◷", "Lịch hẹn / tiếp nhận", "/appointments"],
      ["🚘", "Tra cứu xe", "/vehicles"],
      ["▤", "Dịch vụ", "/services"],
      ["↗", "Tổng quan", "/reports"],
    ],
    technician: [["🔧", "Công việc của tôi", "/appointments"]],
    admin: [
      ["◷", "Lịch hẹn", "/appointments"],
      ["♙", "Tài khoản / nhân viên", "/users"],
      ["🚘", "Phương tiện", "/vehicles"],
      ["▤", "Dịch vụ / bảng giá", "/services"],
      ["⌂", "Gara / cấu hình", "/garages"],
      ["↗", "Thống kê / doanh thu", "/reports"],
    ],
  };
  return (
    <Screen
      title={`Xin chào, ${user?.name || "bạn"}!`}
      subtitle={roles[user?.role]}
      refresh={q.reload}
    >
      <View style={s.hero}>
        <Text style={s.heroTitle}>{active.length} lịch đang xử lý</Text>
        <Text style={s.heroText}>
          {
            list.filter(
              (a: any) =>
                new Date(a.starts_at).toLocaleDateString("en-CA", {
                  timeZone: "Asia/Bangkok",
                }) ===
                new Date().toLocaleDateString("en-CA", {
                  timeZone: "Asia/Bangkok",
                }),
            ).length
          }{" "}
          lịch hôm nay. Cùng chăm sóc từng chiếc xe, từ lịch hẹn đến khi bàn
          giao.
        </Text>
      </View>
      <ErrorText text={q.error} />
      <Body>{connected?'● Đang cập nhật trực tiếp':'○ Đang kết nối lại cập nhật trực tiếp…'}</Body>
      {user?.role === "customer" && (
        <>
          <Button
            title="Bật nhắc lịch trên điện thoại"
            secondary
            onPress={() =>
              task.run(async () => {
                await enableReminders();
                await syncReminders(list, user.id);
              }, "Đã bật nhắc lịch cho các lịch đã đồng bộ.")
            }
          />
          <Feedback task={task} />
        </>
      )}
      <View style={s.grid}>
        {[...(menu[user?.role] || []), ["♙", "Hồ sơ của tôi", "/profile"]].map(
          ([icon, title, path]: string[]) => (
            <Pressable key={path} style={s.tile} onPress={() => go(path)}>
              <Text style={{ fontSize: 24, color: "#21604D" }}>{icon}</Text>
              <Text style={[s.heading, { fontSize: 14 }]}>{title}</Text>
            </Pressable>
          ),
        )}
      </View>
      <Heading>Lịch gần nhất</Heading>
      {active
        .slice()
        .sort(
          (a: any, b: any) => Date.parse(a.starts_at) - Date.parse(b.starts_at),
        )
        .slice(0, 3)
        .map((a: any) => (
          <Pressable key={a.id} onPress={() => go("/appointment?id=" + a.id)}>
            <Card>
              <Badge status={a.status} />
              <Heading>
                {a.plate} · #{a.id}
              </Heading>
              <Body>
                {date(a.starts_at)} · {a.garage_name}
              </Body>
            </Card>
          </Pressable>
        ))}
      {!active.length && <Body>Chưa có lịch đang xử lý.</Body>}
    </Screen>
  );
}
