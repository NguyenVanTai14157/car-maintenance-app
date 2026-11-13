import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
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
      showBottomNav
      title="Xe khỏe, hành trình an tâm"
      refresh={q.reload}
      planCount={d ? plans.length : undefined}
    >
      <HomeBanners />
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

const banners = [
  {
    title: "Đến lúc chăm xe?",
    action: "Xem lịch bảo dưỡng",
    path: "/plans",
    background: "#174C40",
    image: require("../../assets/maintenance-banner.jpg"),
  },
  {
    title: "Vừa bảo dưỡng xe?",
    action: "Ghi lại lần bảo dưỡng",
    path: "/record-edit",
    background: "#173B55",
  },
] as const;

function HomeBanners() {
  const [width, setWidth] = useState(0);
  const cardWidth = Math.round(width * 0.9);

  return (
    <View onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
      {cardWidth > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={cardWidth + 10}
          contentContainerStyle={bannerStyles.row}
        >
          {banners.map((banner) => (
            <Pressable
              key={banner.path}
              accessibilityRole="button"
              accessibilityLabel={`${banner.title} ${banner.action}`}
              onPress={() => go(banner.path)}
              style={[
                bannerStyles.card,
                { width: cardWidth, backgroundColor: banner.background },
              ]}
            >
              <View style={bannerStyles.copy}>
                <Text style={bannerStyles.title}>{banner.title}</Text>
                <Text style={bannerStyles.action}>{banner.action}</Text>
              </View>
              {"image" in banner && width >= 320 && (
                <View style={bannerStyles.imageFrame}>
                  <Image
                    source={banner.image}
                    style={bannerStyles.image}
                    resizeMode="cover"
                    accessible={false}
                  />
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  row: { gap: 10 },
  card: {
    minHeight: 96,
    flexDirection: "row",
    borderRadius: 16,
    overflow: "hidden",
  },
  copy: { flex: 1, paddingHorizontal: 14, paddingVertical: 10, justifyContent: "center", gap: 5 },
  title: { color: "white", fontSize: 19, fontWeight: "800" },
  action: { color: "#D7E9AA", fontSize: 13, fontWeight: "700" },
  imageFrame: { width: "35%" },
  image: { position: "absolute", width: "100%", height: "100%" },
});
