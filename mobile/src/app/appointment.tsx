import {MaintenancePhotos} from "../components/maintenance-photos";
import React, { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  Screen,
  Card,
  Heading,
  Body,
  Field,
  Button,
  Feedback,
  useSubmit,
  ErrorText,
  Chips,
  Badge,
  date,
  money,
  statuses,
  confirm,
} from "../components/ui";
import { useData } from "../hooks/data";
import { useSession } from "../hooks/session";
import { api } from "../services/api";
export default function Appointment() {
  const { id } = useLocalSearchParams();
  const q = useData("/appointments/" + id),
    { user } = useSession(),
    staff = useData(
      ["admin", "receptionist"].includes(user?.role) ? "/staff" : "/garages",
    );
  const task = useSubmit();
  const [reason, R] = useState(""),
    [when, W] = useState(""),
    [condition, C] = useState(""),
    [km, K] = useState(""),
    [tech, T] = useState(0),
    [description, D] = useState(""),
    [amount, A] = useState(""),
    [rating, Rating] = useState(5),
    [comment, Comment] = useState(""),
    [message, M] = useState("");
  const a = q.data;
  const receptionist = ["admin", "receptionist"].includes(user?.role),
    customer = user?.role === "customer",
    technician = user?.role === "technician";
  const action = (name: string, body: any = {}) =>
    task.run(async () => {
      await api(`/appointments/${id}/action`, "POST", {
        action: name,
        ...body,
      });
      await q.reload();
    });
  const is = (...states: string[]) => states.includes(a?.status);
  const hasRequiredPhotos = ['before', 'after'].every(kind =>
    a?.photos?.some((photo: any) => photo.kind === kind),
  );
  return (
    <Screen title={`Lịch bảo dưỡng #${id}`} refresh={q.reload}>
      <ErrorText text={q.error} />
      {!a ? (
        <Body>Đang tải lịch…</Body>
      ) : (
        <>
          <Card>
            <Badge status={a.status} />
            <Heading>
              {a.vehicle.plate} · {a.vehicle.brand} {a.vehicle.model}
            </Heading>
            <Body>
              {a.customer.name} · {a.customer.phone || a.customer.email}
            </Body>
            <Body>
              {a.garage.name} · {a.garage.address}
            </Body>
            <Body>
              {date(a.starts_at)} → {date(a.ends_at)}
            </Body>
            <Body>Yêu cầu: {a.notes || "Không có"}</Body>
            <Body>Tình trạng xe: {a.condition || "Chưa tiếp nhận"}</Body>
            {!!a.reason && <Body>Lý do gần nhất: {a.reason}</Body>}
            {a.services.map((v: any) => (
              <Body key={v.id}>
                {v.name} · {money(v.price)}
              </Body>
            ))}
            <Heading>Tổng chi phí: {money(a.total)}</Heading>
            <Body>{a.paid ? "✓ Đã thanh toán" : "Chưa thanh toán"}</Body>
          </Card>
          <Feedback task={task} />
          {receptionist && is("pending") && (
            <Button
              disabled={task.busy}
              title="Xác nhận lịch hẹn"
              onPress={() => action("confirm")}
            />
          )}
          {(customer || receptionist) &&
            is("pending", "confirmed", "reschedule_proposed") && (
              <Card>
                <Heading>Thay đổi lịch</Heading>
                <Field label="Lý do" value={reason} onChange={R} />
                <Field
                  label="Giờ mới (YYYY-MM-DD HH:mm)"
                  placeholder="2026-11-06 09:00"
                  value={when}
                  onChange={W}
                />
                <Button
                  disabled={task.busy}
                  title={
                    customer ? "Yêu cầu đổi lịch" : "Đề xuất giờ khác cho khách"
                  }
                  onPress={() =>
                    action(customer ? "reschedule" : "propose", {
                      reason,
                      starts_at: when.replace(" ", "T") + ":00+07:00",
                    })
                  }
                />
                <Button
                  disabled={task.busy}
                  title="Hủy lịch"
                  danger
                  onPress={() =>
                    confirm(
                      "Bạn muốn hủy lịch này?",
                      () => void action("cancel", { reason }),
                    )
                  }
                />
                {receptionist && (
                  <Button
                    title="Từ chối lịch"
                    disabled={task.busy}
                    secondary
                    onPress={() => action("reject", { reason })}
                  />
                )}
              </Card>
            )}
          {customer && is("reschedule_proposed") && (
            <Card>
              <Heading>Gara đề xuất: {date(a.proposed_at)}</Heading>
              <Button
                disabled={task.busy}
                title="Đồng ý giờ mới"
                onPress={() => action("accept_time")}
              />
              <Button
                disabled={task.busy}
                title="Từ chối giờ mới (nhập lý do ở trên)"
                secondary
                onPress={() => action("decline_time", { reason })}
              />
            </Card>
          )}
          {receptionist && is("confirmed") && (
            <Card>
              <Heading>Tiếp nhận xe</Heading>
              <Field
                label="Số km khi tiếp nhận"
                value={km}
                onChange={K}
                numeric
                placeholder={String(a.vehicle.odometer)}
              />
              <Field
                label="Tình trạng xe khi đến"
                value={condition}
                onChange={C}
                multiline
              />
              <Button
                title="Xác nhận đã nhận xe"
                disabled={task.busy}
                onPress={() => action("receive", { condition, odometer: km })}
              />
            </Card>
          )}
          {receptionist && is("received", "assigned") && (
            <Card>
              <Heading>Phân công kỹ thuật viên</Heading>
              <Chips
                options={(staff.data || [])
                  .filter((v: any) => v.role === "technician" && v.active)
                  .map((v: any) => ({ label: v.name, value: v.id }))}
                value={tech}
                onChange={T}
              />
              <Button
                title="Giao việc"
                disabled={task.busy}
                onPress={() => action("assign", { technician_id: tech })}
              />
            </Card>
          )}
          {technician && is("assigned") && (
            <Button
              title="Nhận công việc"
              disabled={task.busy}
              onPress={() => action("accept")}
            />
          )}
          {technician && is("accepted") && (
            <Button
              title="Bắt đầu bảo dưỡng"
              disabled={task.busy}
              onPress={() => action("start")}
            />
          )}
          <Card>
            <Heading>Checklist bảo dưỡng</Heading>
            {a.checklist.map((v: any, i: number) => (
              <Button
                key={i}
                secondary={!v.done}
                disabled={task.busy || !technician || !is("in_progress")}
                title={`${v.done ? "✓" : "○"} ${v.label}`}
                onPress={() =>
                  action("checklist", {
                    checked: a.checklist.map((item: any, index: number) =>
                      index === i ? !item.done : item.done,
                    ),
                  })
                }
              />
            ))}
          </Card>
          {technician && is("accepted", "in_progress") && (
            <Card>
              <Heading>Cập nhật tình trạng xe</Heading>
              <Field
                label="Kết quả kiểm tra / tình trạng"
                value={condition}
                onChange={C}
                multiline
              />
              <Button
                title="Lưu tình trạng"
                disabled={task.busy}
                onPress={() => action("condition", { condition })}
              />
            </Card>
          )}
          {(technician || receptionist) &&
            is("received", "assigned", "accepted", "in_progress") && (
              <Card>
                <Heading>Đề xuất phát sinh</Heading>
                <Field
                  label="Dịch vụ / phụ tùng phát sinh"
                  value={description}
                  onChange={D}
                />
                <Field
                  label="Chi phí (VNĐ)"
                  value={amount}
                  onChange={A}
                  numeric
                />
                <Button
                  title="Gửi khách duyệt chi phí"
                  disabled={task.busy}
                  onPress={() => action("extra", { description, amount })}
                />
              </Card>
            )}
          <Card>
            <Heading>Chi phí phát sinh</Heading>
            {!a.extras.length && <Body>Chưa có phát sinh.</Body>}
            {a.extras.map((e: any) => (
              <Card key={e.id}>
                <Body>
                  {e.description} · {money(e.amount)}
                </Body>
                <Body>
                  {
                    (
                      {
                        pending: "Chờ khách duyệt",
                        approved: "Đã đồng ý",
                        rejected: "Đã từ chối",
                      } as any
                    )[e.status]
                  }
                </Body>
                {customer && e.status === "pending" && (
                  <>
                    <Button
                      title="Đồng ý"
                      disabled={task.busy}
                      onPress={() =>
                        action("approve_extra", { extra_id: e.id })
                      }
                    />
                    <Button
                      title="Từ chối"
                      secondary
                      disabled={task.busy}
                      onPress={() => action("reject_extra", { extra_id: e.id })}
                    />
                  </>
                )}
              </Card>
            ))}
          </Card>
          <MaintenancePhotos appointmentId={String(id)} photos={a.photos} editable={technician && is("accepted", "in_progress")} reload={q.reload} />
          {technician && is("in_progress") && (
            <>
            {!hasRequiredPhotos && <Body>Cần tải ảnh trước và ảnh sau bảo dưỡng để hoàn thành công việc.</Body>}
            <Button
              title="Hoàn thành bảo dưỡng"
              disabled={task.busy || !hasRequiredPhotos}
              onPress={() =>
                confirm(
                  "Xác nhận đã hoàn thành các hạng mục?",
                  () => void action("finish"),
                )
              }
            />
            </>
          )}
          {receptionist && is("ready") && (
            <Card>
              <Heading>Thanh toán & bàn giao</Heading>
              <Body>
                {money(a.total)} ·{" "}
                {a.paid ? "Đã thanh toán" : "Chưa thanh toán"}
              </Body>
              <Button
                title={
                  a.paid
                    ? "Chuyển về chưa thanh toán"
                    : "Ghi nhận đã thanh toán"
                }
                secondary
                disabled={task.busy}
                onPress={() => action("payment", { paid: !a.paid })}
              />
              <Button
                title="Xác nhận bàn giao xe"
                disabled={task.busy || !a.paid}
                onPress={() =>
                  confirm(
                    "Xác nhận đã bàn giao xe cho khách?",
                    () => void action("handover"),
                  )
                }
              />
            </Card>
          )}
          {customer && is("completed") && !a.review && (
            <Card>
              <Heading>Đánh giá dịch vụ</Heading>
              <Chips
                value={rating}
                onChange={Rating}
                options={[1, 2, 3, 4, 5].map((n) => ({
                  label: n + " ★",
                  value: n,
                }))}
              />
              <Field
                label="Nhận xét"
                value={comment}
                onChange={Comment}
                multiline
              />
              <Button
                title="Gửi đánh giá"
                disabled={task.busy}
                onPress={() => action("review", { rating, comment })}
              />
            </Card>
          )}
          {a.review && (
            <Card>
              <Heading>Đánh giá {a.review.rating}/5 ★</Heading>
              <Body>{a.review.comment}</Body>
            </Card>
          )}
          {receptionist && (
            <Card>
              <Heading>Thông báo cho khách</Heading>
              <Field label="Nội dung" value={message} onChange={M} multiline />
              <Button
                title="Gửi thông báo trong app"
                disabled={task.busy}
                onPress={() => action("message", { message })}
              />
            </Card>
          )}
          <Card>
            <Heading>Nhật ký xử lý</Heading>
            {a.events.map((e: any) => (
              <Body key={e.id}>
                {date(e.created_at)} · {e.actor || "Hệ thống"}
                {"\n"}
                {e.note || statuses[e.action] || "Tạo lịch hẹn"}
              </Body>
            ))}
          </Card>
          <Feedback task={task} />
        </>
      )}
    </Screen>
  );
}
