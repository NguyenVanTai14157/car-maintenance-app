import { type ComponentRef, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Animated,
  type ImageSourcePropType,
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
import { API_URL } from "../services/api";
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

function HomeBanners() {
  const [width, setWidth] = useState(0),
    [activeIndex, setActiveIndex] = useState(0);
  const carousel = useRef<ComponentRef<typeof ScrollView>>(null);
  const remote = useData("/banners");
  const slides: {
    id: string;
    title: string;
    action: string;
    path: string;
    background: string;
    images: ImageSourcePropType[];
  }[] = Array.isArray(remote.data)
    ? remote.data.map((banner: any, index: number) => ({
        id: String(banner.id),
        title: banner.title,
        action: banner.action_text,
        path: banner.target_path,
        background: index % 2 === 0 ? "#174C40" : "#173B55",
        images: ((banner.image_paths ?? [banner.image_path]) as string[]).map(
          (path) => ({ uri: API_URL + path }),
        ),
      }))
    : [];
  const cardWidth = Math.round(width);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setActiveIndex(0);
      carousel.current?.scrollTo({ x: 0, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [slides.length, cardWidth]);

  if (!slides.length) return null;

  return (
    <View onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
      {cardWidth > 0 && (
        <ScrollView
          ref={carousel}
          horizontal
          scrollEnabled={slides.length > 1}
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={cardWidth + 10}
          contentContainerStyle={bannerStyles.row}
          onMomentumScrollEnd={({ nativeEvent }) => {
            const index = Math.round(nativeEvent.contentOffset.x / (cardWidth + 10));
            setActiveIndex(Math.max(0, Math.min(index, slides.length - 1)));
          }}
        >
          {slides.map((banner, index) => (
            <Pressable
              key={banner.id}
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
              {banner.images.length > 0 && (
                <BannerPhotos
                  sources={banner.images}
                  active={index === activeIndex}
                />
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}
      {slides.length > 1 && (
        <View style={bannerStyles.dots} accessibilityLabel={`Banner ${activeIndex + 1} trên ${slides.length}`}>
          {slides.map((banner, index) => (
            <View key={banner.id} style={[bannerStyles.dot, index === activeIndex && bannerStyles.activeDot]} />
          ))}
        </View>
      )}
    </View>
  );
}

function BannerPhotos({
  sources,
  active,
}: {
  sources: ImageSourcePropType[];
  active: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const [progress] = useState(() => new Animated.Value(0));
  const count = sources.length;

  useLayoutEffect(() => {
    progress.setValue(0);
  }, [index, progress]);

  useEffect(() => {
    if (!active || count < 2 || !width) return;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    });
    const timer = setInterval(() => {
      animation.start(({ finished }) => {
        if (finished) setIndex((current) => (current + 1) % count);
      });
    }, 3000);
    return () => {
      clearInterval(timer);
      animation.stop();
      progress.setValue(0);
    };
  }, [active, count, progress, width]);

  return (
    <View
      style={bannerStyles.imageFrame}
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
    >
      <Animated.Image
        source={sources[index % count]}
        style={[bannerStyles.image, {
          transform: [{ translateX: Animated.multiply(progress, -width) }],
        }]}
        resizeMode="cover"
        accessible={false}
      />
      {count > 1 && width > 0 && (
        <Animated.Image
          source={sources[(index + 1) % count]}
          style={[bannerStyles.image, {
            transform: [{ translateX: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [width, 0],
            }) }],
          }]}
          resizeMode="cover"
          accessible={false}
        />
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
  imageFrame: { width: "50%", overflow: "hidden" },
  image: { position: "absolute", width: "100%", height: "100%" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 5, paddingTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: "#C6D7CF" },
  activeDot: { width: 16, backgroundColor: "#21604D" },
});
