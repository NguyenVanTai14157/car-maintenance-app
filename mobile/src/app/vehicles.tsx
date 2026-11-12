import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  isMaintenanceFilter,
  maintenanceFilters,
  matchingVehicleIds,
} from "../utils/maintenance-overview";
import { Alert, BackHandler, Platform } from "react-native";
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
  pickPhotos,
  Screen,
  useSubmit,
} from "../components/ui";
import { useData } from "../hooks/data";
import { api } from "../services/api";
import { MAX_VEHICLE_PHOTOS, vehiclePhotos } from "../utils/vehicle-photos";
import { PhotoGallery } from "../components/photo-gallery";
export default function Vehicles() {
  const params = useLocalSearchParams();
  const q = useData("/vehicles"),
    plans = useData("/plans");
  const [filter, setFilter] = useState<string>(
    isMaintenanceFilter(params.status) ? params.status : "all",
  );
  const [archived, A] = useState(false),
    [edit, E] = useState<any>(undefined),
    [savedId, setSavedId] = useState<number | null>(null);
  const ids = isMaintenanceFilter(filter)
    ? matchingVehicleIds(plans.data || [], filter)
    : null;
  const ready = !!q.data && (!ids || !!plans.data);
  const list = ready
    ? q.data.filter(
        (v: any) => v.archived === archived && (!ids || ids.has(v.id)),
      )
    : [];
  const reload = async () => {
    await Promise.all([q.reload(), plans.reload()]);
  };
  useFocusEffect(
    useCallback(() => {
      if (edit === undefined || Platform.OS !== "android") return;
      const handler = BackHandler.addEventListener("hardwareBackPress", () => {
        E(undefined);
        return true;
      });
      return () => handler.remove();
    }, [edit]),
  );
  if (edit !== undefined)
    return (
      <Screen
        key="vehicle-form"
        title={edit ? "Sửa thông tin xe" : "Thêm xe"}
        onBack={() => E(undefined)}
      >
        <VehicleForm
          key={edit?.id || "new"}
          initial={edit}
          close={() => E(undefined)}
          saved={async (vehicle: any, updating: boolean) => {
            A(vehicle.archived);
            setFilter("all");
            setSavedId(vehicle.id);
            await reload();
            E(undefined);
            const title = updating
              ? "Đã cập nhật xe thành công"
              : "Đã thêm xe thành công";
            const message = [
              `Hãng xe: ${vehicle.brand}`,
              `Dòng xe: ${vehicle.model}`,
              `Biển số: ${vehicle.plate || "Chưa cung cấp"}`,
              `Năm sản xuất: ${vehicle.year || "Chưa cung cấp"}`,
              `Số km hiện tại: ${Number(vehicle.odometer).toLocaleString("vi-VN")} km`,
            ].join("\n");
            if (Platform.OS === "web") window.alert(title + "\n" + message);
            else Alert.alert(title, message, [{ text: "Đã hiểu" }]);
          }}
        />
      </Screen>
    );
  return (
    <Screen
      key="vehicle-list"
      title={
        isMaintenanceFilter(filter)
          ? `Xe ${maintenanceFilters[filter].toLowerCase()} bảo dưỡng`
          : "Xe của tôi"
      }
      refresh={reload}
    >
      <ErrorText text={q.error || (ids ? plans.error : "")} />
      <Button
        title="Thêm xe"
        onPress={() => {
          setSavedId(null);
          E(null);
        }}
      />
      <Chips
        value={archived}
        onChange={(value) => {
          A(value);
          setFilter("all");
        }}
        options={[
          { label: "Đang sử dụng", value: false },
          { label: "Đã lưu trữ", value: true },
        ]}
      />
      <Chips
        value={filter}
        onChange={(value) => {
          setFilter(value);
          A(false);
        }}
        options={[
          { label: "Tất cả xe", value: "all" },
          ...Object.entries(maintenanceFilters).map(([value, label]) => ({
            value,
            label,
          })),
        ]}
      />
      {list.map((v: any) => (
        <VehicleCard
          key={v.id}
          vehicle={v}
          justSaved={v.id === savedId}
          edit={() => {
            setSavedId(null);
            E(v);
          }}
          reload={reload}
          status={filter}
        />
      ))}
      {!ready && <Body>Đang tải danh sách xe…</Body>}
      {ready && !list.length && (
        <Empty
          text={
            isMaintenanceFilter(filter)
              ? `Không có xe ${maintenanceFilters[filter].toLowerCase()} bảo dưỡng.`
              : "Chưa có xe trong danh sách này."
          }
        />
      )}
    </Screen>
  );
}
function VehicleCard({ vehicle: v, justSaved, edit, reload, status }: any) {
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
      {!!vehiclePhotos(v).length && (
        <>
          <Body>Ảnh xe ({vehiclePhotos(v).length}):</Body>
          <PhotoGallery images={vehiclePhotos(v)} />
        </>
      )}
      <Button title="Sửa / cập nhật số km" secondary onPress={edit} />
      <Button
        title="Xem lịch bảo dưỡng"
        secondary
        onPress={() =>
          go(
            "/plans?vehicle=" +
              v.id +
              (isMaintenanceFilter(status) ? "&status=" + status : ""),
          )
        }
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
        title="Xóa xe"
        danger
        disabled={task.busy}
        onPress={() =>
          confirm(
            "Bạn có muốn xóa xe này? Nếu xe đã có lịch hoặc lịch sử bảo dưỡng, hãy dùng Lưu trữ xe để giữ lại thông tin.",
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
  const [b, B] = useState<any>({
    ...(initial || {
      brand: "",
      model: "",
      plate: "",
      year: "",
      odometer: "",
      notes: "",
    }),
    images: vehiclePhotos(initial),
  });
  const task = useSubmit();
  const examples: Record<string, string> = {
    brand: "Ví dụ: Toyota, Hyundai, Honda",
    model: "Ví dụ: Vios, Accent, City",
    plate: "Ví dụ: 51A-123.45",
    year: "Ví dụ: 2022",
    odometer: "Ví dụ: 35000",
    notes: "Ví dụ: Xe gia đình, thường đi trong thành phố",
  };
  const field = (key: string, label: string, numeric = false) => (
    <Field
      label={label}
      placeholder={examples[key]}
      value={b[key]}
      onChange={(v) => B({ ...b, [key]: v })}
      numeric={numeric}
      unit={key === "odometer" ? "km" : undefined}
      multiline={key === "notes"}
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
      <Heading>Ảnh xe ({b.images.length})</Heading>
      <PhotoGallery
        images={b.images}
        disabled={task.busy}
        onRemove={(index) =>
          B({
            ...b,
            images: b.images.filter((_: string, i: number) => i !== index),
          })
        }
      />
      <Button
        title={b.images.length ? "Thêm ảnh xe" : "Chọn ảnh xe"}
        secondary
        disabled={task.busy || b.images.length >= MAX_VEHICLE_PHOTOS}
        onPress={() =>
          task.run(async () => {
            const selected = await pickPhotos(
              false,
              MAX_VEHICLE_PHOTOS - b.images.length,
            );
            const images = [...new Set([...b.images, ...selected])];
            if (images.length > MAX_VEHICLE_PHOTOS)
              throw Error(
                "Bạn đã chọn đủ ảnh cho xe. Hãy bỏ bớt ảnh trước khi thêm ảnh khác.",
              );
            B({ ...b, images });
          }, "")
        }
      />
      <Feedback task={task} />
      <Button
        title={task.busy ? "Đang lưu…" : "Lưu xe"}
        disabled={task.busy}
        onPress={() =>
          task.run(async () => {
            const body = { ...b };
            delete body.image;
            const vehicle = await api(
              "/vehicles" + (initial ? "/" + initial.id : ""),
              initial ? "PATCH" : "POST",
              body,
            );
            await saved(vehicle, !!initial);
          }, "")
        }
      />
      <Button title="Hủy" secondary disabled={task.busy} onPress={close} />
    </Card>
  );
}
