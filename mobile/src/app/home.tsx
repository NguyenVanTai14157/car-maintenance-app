import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { matchingVehicleIds } from "../utils/maintenance-overview";
import { dayLabel, PlanCard } from "../components/personal";
import {
  Body,
  Button,
  Card,
  Empty,
  ErrorText,
  go,
  Heading,
  money,
  s,
  Screen,
} from "../components/ui";
import { useData } from "../hooks/data";
export default function Home() {
  const { width, fontScale } = useWindowDimensions();
  const tileWidth =
    fontScale >= 1.5 || width < 340 ? "100%" : width >= 1024 ? "23%" : "48%";
  const q = useData("/dashboard"),
    d = q.data;
  const plans = d ? [...d.overdue, ...d.due, ...d.upcoming] : [];
  const overview = d
    ? [
        {
          title: "Xe đang sử dụng",
          count: d.vehicles,
          path: "/vehicles",
          ink: "#21604D",
          bg: "#EEF4EF",
        },
        {
          title: "Quá hạn",
          count: matchingVehicleIds(plans, "overdue").size,
          path: "/vehicles?status=overdue",
          ink: "#A3332B",
          bg: "#FCEAE8",
        },
        {
          title: "Đến hạn",
          count: matchingVehicleIds(plans, "due").size,
          path: "/vehicles?status=due",
          ink: "#805600",
          bg: "#FFF2D5",
        },
        {
          title: "Sắp đến hạn",
          count: matchingVehicleIds(plans, "soon").size,
          path: "/vehicles?status=soon",
          ink: "#285D86",
          bg: "#EDF4FC",
        },
      ]
    : [];
  return (
    <Screen
      wide
      showBack={false}
      title="Xe khỏe, hành trình an tâm"
      subtitle="Lịch bảo dưỡng cá nhân của bạn"
      refresh={q.reload}
    >
      <ErrorText text={q.error} />
      {d && (
        <>
          <View style={s.grid}>
            {overview.map((item) => (
              <Pressable
                key={item.title}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}: ${item.count} xe`}
                onPress={() => go(item.path)}
                style={[
                  s.tile,
                  { width: tileWidth, backgroundColor: item.bg, gap: 8 },
                ]}
              >
                <Text
                  style={{ color: item.ink, fontSize: 30, fontWeight: "800" }}
                >
                  {item.count} <Text style={{ fontSize: 14 }}>xe</Text>
                </Text>
                <Text
                  style={{ color: item.ink, fontSize: 15, fontWeight: "700" }}
                >
                  {item.title}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xem lịch sử chi phí: ${money(d.total_cost)}`}
            onPress={() => go("/records?withCost=1")}
          >
            <Card>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Body>Chi phí đã ghi nhận: {money(d.total_cost)}</Body>
                </View>
                <Text
                  style={[s.smallLink, { flexShrink: 0 }]}
                  numberOfLines={1}
                >
                  Xem lịch sử →
                </Text>
              </View>
            </Card>
          </Pressable>
          <View style={s.grid}>
            {[
              ["Xe của tôi", "/vehicles"],
              ["Lịch bảo dưỡng", "/plans"],
              ["Thêm lần bảo dưỡng", "/record-edit"],
              ["Lịch sử", "/records"],
              ["Hạng mục", "/categories"],
              ["Chi phí", "/costs"],
              ["Cài đặt & sao lưu", "/settings"],
              ["Tài khoản", "/profile"],
            ].map(([title, path]) => (
              <View key={path} style={{ width: tileWidth }}>
                <Button title={title} secondary onPress={() => go(path)} />
                {path === "/plans" && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      minWidth: 24,
                      minHeight: 24,
                      paddingHorizontal: 6,
                      borderRadius: 12,
                      backgroundColor: "#21604D",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: "#F3F6F4",
                    }}
                  >
                    <Text
                      accessibilityLabel={`${plans.length} lịch đang theo dõi`}
                      style={{
                        color: "white",
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {plans.length}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
          <Heading>Cần chú ý</Heading>
          {[
            ...d.overdue,
            ...d.due,
            ...d.upcoming.filter((p: any) => p.status === "soon"),
          ]
            .slice(0, 5)
            .map((p: any) => (
              <PlanCard key={p.id} plan={p} compact />
            ))}
          {!d.overdue.length &&
            !d.due.length &&
            !d.upcoming.some((p: any) => p.status === "soon") && (
              <Empty text="Chưa có lịch cần nhắc. Thêm xe và đặt lịch bảo dưỡng để bắt đầu." />
            )}
          <Heading>Gần đây</Heading>
          {d.recent.map((r: any) => (
            <Card key={r.id}>
              <Heading>{r.category_name}</Heading>
              <Body>Ngày thực hiện: {dayLabel(r.performed_date)}</Body>
              <Body>Chi phí: {money(r.cost)}</Body>
              <Button
                title="Xem chi tiết bảo dưỡng"
                secondary
                onPress={() => go("/record?id=" + r.id)}
              />
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
