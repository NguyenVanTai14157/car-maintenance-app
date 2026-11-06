import { View } from "react-native";
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
  const q = useData("/dashboard"),
    d = q.data;
  return (
    <Screen
      showBack={false}
      title="Xe khỏe, hành trình an tâm"
      subtitle="Lịch bảo dưỡng cá nhân của bạn"
      refresh={q.reload}
    >
      <ErrorText text={q.error} />
      {d && (
        <>
          <Card>
            <Heading>{d.vehicles} xe đang sử dụng</Heading>
            <Body>
              {d.overdue.length} quá hạn · {d.due.length} đến hạn ·{" "}
              {d.upcoming.filter((p: any) => p.status === "soon").length} sắp
              đến hạn
            </Body>
            <Body>Chi phí đã ghi nhận: {money(d.total_cost)}</Body>
          </Card>
          <View style={s.grid}>
            {[
              ["Xe của tôi", "/vehicles"],
              ["Lịch bảo dưỡng", "/plans"],
              ["Ghi nhận bảo dưỡng", "/record-edit"],
              ["Lịch sử", "/records"],
              ["Hạng mục", "/categories"],
              ["Chi phí", "/costs"],
              ["Cài đặt & sao lưu", "/settings"],
              ["Tài khoản", "/profile"],
            ].map(([title, path]) => (
              <View key={path} style={{ width: "48%" }}>
                <Button title={title} secondary onPress={() => go(path)} />
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
              <PlanCard key={p.id} plan={p} />
            ))}
          {!d.overdue.length &&
            !d.due.length &&
            !d.upcoming.some((p: any) => p.status === "soon") && (
              <Empty text="Chưa có lịch cần nhắc. Thêm xe và tạo kế hoạch để bắt đầu." />
            )}
          <Heading>Gần đây</Heading>
          {d.recent.map((r: any) => (
            <Card key={r.id}>
              <Heading>{r.category_name}</Heading>
              <Body>
                {dayLabel(r.performed_date)} · {money(r.cost)}
              </Body>
              <Button
                title="Xem bản ghi"
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
