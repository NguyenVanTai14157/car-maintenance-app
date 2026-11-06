import { useState } from "react";
import { Alert, Platform } from "react-native";
import {
  Body,
  Button,
  Card,
  Chips,
  confirm,
  Empty,
  ErrorText,
  Feedback,
  Field,
  go,
  Heading,
  Photo,
  pickPhoto,
  Screen,
  useSubmit,
} from "../components/ui";
import { useData } from "../hooks/data";
import { api } from "../services/api";
export default function Vehicles() {
  const q = useData("/vehicles");
  const [archived, A] = useState(false),
    [edit, E] = useState<any>(undefined),
    [savedId, setSavedId] = useState<number | null>(null);
  return (
    <Screen title="Xe của tôi" refresh={q.reload}>
      <ErrorText text={q.error} />
      <Button
        title="Thêm xe"
        onPress={() => {
          setSavedId(null);
          E(null);
        }}
      />
      <Chips
        value={archived}
        onChange={A}
        options={[
          { label: "Đang sử dụng", value: false },
          { label: "Đã lưu trữ", value: true },
        ]}
      />
      {edit !== undefined && (
        <VehicleForm
          key={edit?.id || "new"}
          initial={edit}
          close={() => E(undefined)}
          saved={async (vehicle: any, updating: boolean) => {
            E(undefined);
            A(vehicle.archived);
            setSavedId(vehicle.id);
            const title = updating
              ? "Đã cập nhật xe thành công"
              : "Đã thêm xe thành công";
            const message = `${vehicle.brand} ${vehicle.model}${vehicle.plate ? " · " + vehicle.plate : ""}\nThông tin xe đã được lưu vào tài khoản của bạn.`;
            if (Platform.OS === "web") window.alert(title + "\n" + message);
            else Alert.alert(title, message, [{ text: "Đã hiểu" }]);
            await q.reload();
          }}
        />
      )}
      {(q.data || [])
        .filter((v: any) => v.archived === archived)
        .map((v: any) => (
          <VehicleCard
            key={v.id}
            vehicle={v}
            justSaved={v.id === savedId}
            edit={() => {
              setSavedId(null);
              E(v);
            }}
            reload={q.reload}
          />
        ))}
      {q.data && !q.data.filter((v: any) => v.archived === archived).length && (
        <Empty text="Chưa có xe trong danh sách này." />
      )}
    </Screen>
  );
}
function VehicleCard({ vehicle: v, justSaved, edit, reload }: any) {
  const task = useSubmit();
  return (
    <Card>
      {justSaved && <Body>✓ Thông tin xe đã được lưu</Body>}
      <Heading>Thông tin xe</Heading>
      <Body>Hãng xe: {v.brand}</Body>
      <Body>Dòng xe: {v.model}</Body>
      <Body>Biển số: {v.plate || "Chưa cung cấp"}</Body>
      <Body>Năm sản xuất: {v.year || "Chưa cung cấp"}</Body>
      <Body>Số km hiện tại: {v.odometer.toLocaleString("vi-VN")} km</Body>
      <Body>Ghi chú: {v.notes || "Không có ghi chú"}</Body>
      {!!v.image && (
        <>
          <Body>Ảnh xe:</Body>
          <Photo uri={v.image} />
        </>
      )}
      <Button title="Sửa / cập nhật số km" secondary onPress={edit} />
      <Button
        title="Xem lịch bảo dưỡng"
        secondary
        onPress={() => go("/plans?vehicle=" + v.id)}
      />
      <Button
        title="Xem lịch sử"
        secondary
        onPress={() => go("/records?vehicle=" + v.id)}
      />
      <Button
        title={v.archived ? "Khôi phục xe" : "Lưu trữ xe"}
        secondary
        disabled={task.busy}
        onPress={() =>
          confirm(
            v.archived
              ? "Khôi phục xe?"
              : "Lưu trữ xe và dừng nhắc lịch? Lịch sử vẫn được giữ.",
            () =>
              void task.run(async () => {
                await api("/vehicles/" + v.id + "/archive", "POST", {
                  archived: !v.archived,
                });
                await reload();
              }),
          )
        }
      />
      <Button
        title="Xóa xe chưa có dữ liệu"
        danger
        disabled={task.busy}
        onPress={() =>
          confirm(
            "Xóa xe? Xe có lịch/lịch sử cần dùng Lưu trữ thay thế.",
            () =>
              void task.run(async () => {
                await api("/vehicles/" + v.id, "DELETE");
                await reload();
              }),
          )
        }
      />
      <Feedback task={task} />
    </Card>
  );
}
function VehicleForm({ initial, saved, close }: any) {
  const [b, B] = useState<any>(
    initial || {
      brand: "",
      model: "",
      plate: "",
      year: "",
      odometer: "",
      notes: "",
      image: "",
    },
  );
  const task = useSubmit();
  const examples: Record<string, string> = {
    brand: "Ví dụ: Toyota, Hyundai, Honda",
    model: "Ví dụ: Vios, Accent, City",
    plate: "Ví dụ: 51A-123.45",
    year: "Ví dụ: 2022",
    odometer: "Ví dụ: 35000 (km)",
    notes: "Ví dụ: Xe gia đình, thường đi trong thành phố",
  };
  const field = (key: string, label: string, numeric = false) => (
    <Field
      label={label}
      placeholder={examples[key]}
      value={b[key]}
      onChange={(v) => B({ ...b, [key]: v })}
      numeric={numeric}
    />
  );
  return (
    <Card>
      <Heading>{initial ? "Chỉnh sửa xe" : "Thêm phương tiện"}</Heading>
      {field("brand", "Hãng xe")}
      {field("model", "Dòng xe")}
      {field("plate", "Biển số (không bắt buộc)")}
      {field("year", "Năm sản xuất (không bắt buộc)", true)}
      {field("odometer", "Số km hiện tại", true)}
      {field("notes", "Ghi chú")}
      {!!b.image && <Photo uri={b.image} />}
      <Button
        title="Chọn ảnh xe"
        secondary
        onPress={() =>
          task.run(async () => {
            const image = await pickPhoto();
            if (image) B({ ...b, image });
          }, "")
        }
      />
      <Feedback task={task} />
      <Button
        title={task.busy ? "Đang lưu…" : "Lưu xe"}
        disabled={task.busy}
        onPress={() =>
          task.run(async () => {
            const vehicle = await api(
              "/vehicles" + (initial ? "/" + initial.id : ""),
              initial ? "PATCH" : "POST",
              b,
            );
            await saved(vehicle, !!initial);
          }, "")
        }
      />
      <Button
        title="Đóng biểu mẫu"
        secondary
        disabled={task.busy}
        onPress={close}
      />
    </Card>
  );
}
