import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../../common/types/authenticated-request";
import {
  allow,
  fail,
  imageData,
  integer,
  text,
} from "../../common/validation/input";
import { ACTIVE } from "./appointment-status";
import { appointmentDate } from "../../common/validation/appointment-date";
import { AppointmentsRepository } from "./appointments.repository";
import type { AppointmentsInput } from "./dto/input.dto";
@Injectable()
export class AppointmentsService {
  constructor(
    @Inject(AppointmentsRepository)
    private readonly repository: AppointmentsRepository,
  ) {}
  async slot(
    c: any,
    garageId: number,
    when: any,
    duration: number,
    vehicleId: number,
    exclude = 0,
  ) {
    const date = appointmentDate(when);
    if (!Number.isFinite(date.getTime()) || date.getTime() < Date.now() + 60000)
      fail("Chọn thời gian trong tương lai.");
    await this.repository.lockGarage([garageId], c);
    await this.repository.lockVehicle([1000000 + vehicleId], c);
    const g = (await this.repository.findActiveGarage([garageId], c)).rows[0];
    if (!g) fail("Gara không hoạt động.");
    const local = new Date(date.getTime() + 7 * 3600000);
    const minute = local.getUTCHours() * 60 + local.getUTCMinutes();
    if (
      minute % 30 ||
      local.getUTCSeconds() ||
      local.getUTCMilliseconds() ||
      minute < g.open_hour * 60 ||
      minute + duration > g.close_hour * 60
    )
      fail(
        "Lịch phải bắt đầu ở mốc 00/30 phút và nằm trong giờ làm việc của gara.",
      );
    const end = new Date(date.getTime() + duration * 60000);
    const rows = (
      await this.repository.findVehicleOverlaps(
        [ACTIVE, exclude, garageId, vehicleId, end, date],
        c,
      )
    ).rows;
    if (rows.some((a: any) => a.vehicle_id === vehicleId))
      fail("Xe đã có lịch trùng thời gian.");
    // Count concurrent bookings at each boundary, not total overlaps over a long visit.
    const garageRows = (
      await this.repository.findGarageOverlaps(
        [ACTIVE, exclude, garageId, end, date],
        c,
      )
    ).rows;
    const boundaries = [
      date.getTime(),
      ...garageRows
        .map((a: any) => new Date(a.starts_at).getTime())
        .filter((t: number) => t >= date.getTime()),
    ];
    if (
      boundaries.some(
        (t) =>
          garageRows.filter(
            (a: any) =>
              new Date(a.starts_at).getTime() <= t &&
              new Date(a.ends_at).getTime() > t,
          ).length >= g.capacity,
      )
    )
      fail("Gara đã hết chỗ trong khung giờ này. Chọn giờ khác.");
    return { date, end, g };
  }
  async notify(c: any, a: any, message: string) {
    await this.repository.notifyCustomer([a.customer_id, a.id, message], c);
    if (a.technician_id)
      await this.repository.notifyTechnician(
        [a.technician_id, a.id, message],
        c,
      );
  }
  async access(c: any, id: number, u: any, lock = false) {
    const a = (await this.repository.findAppointment([id], c, lock)).rows[0];
    if (!a) throw new NotFoundException("Không tìm thấy lịch.");
    if (
      (u.role === "customer" && a.customer_id !== u.id) ||
      (u.role === "technician" && a.technician_id !== u.id)
    )
      throw new ForbiddenException("Không có quyền xem lịch này.");
    return a;
  }
  publicContact(c: any) {
    return c;
  }
  async reminders() {
    return this.repository.transaction(async (c) => {
      await this.repository.lockReminderScan([], c);
      const rows = (await this.repository.findDueReminders([], c)).rows;
      for (const a of rows) {
        await this.notify(
          c,
          a,
          `${a.notification_template}: lịch #${a.id} lúc ${new Date(a.starts_at).toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" })}.`,
        );
        await this.repository.markReminded([a.id], c);
      }
      return rows.length;
    });
  }
  async list(r: AuthenticatedRequest) {
    return (await this.repository.listVisible([r.user.role, r.user.id])).rows;
  }
  async detail(r: AuthenticatedRequest, raw: string) {
    const id = integer(raw, "ID", 1);
    const a = await this.access(undefined, id, r.user);
    return {
      ...a,
      vehicle: (await this.repository.findVehicle([a.vehicle_id])).rows[0],
      customer: this.publicContact(
        (await this.repository.findCustomerContact([a.customer_id])).rows[0],
      ),
      garage: (await this.repository.findGarage([a.garage_id])).rows[0],
      extras: (await this.repository.listExtras([id])).rows,
      photos: (await this.repository.listPhotos([id])).rows,
      review: (await this.repository.findReview([id])).rows[0],
      events: (await this.repository.listEvents([id])).rows,
    };
  }
  async create(r: AuthenticatedRequest, b: AppointmentsInput) {
    allow(r.user, ["customer"]);
    return this.repository.transaction(async (c) => {
      const vehicleId = integer(b.vehicle_id, "Xe", 1),
        garageId = integer(b.garage_id, "Gara", 1);
      if (
        !(await this.repository.findOwnedVehicle([vehicleId, r.user.id], c))
          .rowCount
      )
        throw new ForbiddenException("Xe không thuộc tài khoản này.");
      if (
        !Array.isArray(b.service_ids) ||
        !b.service_ids.length ||
        b.service_ids.length > 20
      )
        fail("Chọn từ 1 đến 20 dịch vụ.");
      const ids = [
        ...new Set(b.service_ids.map((v: any) => integer(v, "Dịch vụ", 1))),
      ];
      const services = (await this.repository.findActiveServices([ids], c))
        .rows;
      if (services.length !== ids.length) fail("Có dịch vụ đã ngừng cung cấp.");
      const duration = services.reduce(
        (n: number, s: any) => n + s.duration,
        0,
      );
      const { date, end } = await this.slot(
        c,
        garageId,
        b.starts_at,
        duration,
        vehicleId,
      );
      const checklist = services.flatMap((s: any) =>
        s.checklist.map((label: string) => ({
          label: `${s.name}: ${label}`,
          done: false,
        })),
      );
      const total = services.reduce((n: number, s: any) => n + s.price, 0);
      const a = (
        await this.repository.insertAppointment(
          [
            r.user.id,
            vehicleId,
            garageId,
            date,
            end,
            JSON.stringify(services),
            JSON.stringify(checklist),
            text(b.notes, "Ghi chú", 2000, false),
            total,
          ],
          c,
        )
      ).rows[0];
      await this.repository.recordCreation([a.id, r.user.id], c);
      await this.repository.notifyStaffOfCreation(
        [a.id, `Có lịch hẹn mới #${a.id}`],
        c,
      );
      await this.notify(c, a, `Đã gửi lịch #${a.id}. Đang chờ xác nhận.`);
      return a;
    });
  }
  async action(r: AuthenticatedRequest, raw: string, b: AppointmentsInput) {
    const id = integer(raw, "ID", 1);
    return this.repository.transaction(async (c) => {
      // Serialize scheduling mutations, then lock the appointment to prevent duplicate transitions.
      await this.repository.lockWorkflow([], c);
      const a = await this.access(c, id, r.user, true);
      const role = r.user.role;
      const action = text(b.action, "Thao tác", 40);
      const state = (...states: string[]) => {
        if (!states.includes(a.status))
          fail(`Không thể thực hiện khi lịch ở trạng thái ${a.status}.`);
      };
      const staff = () => allow(r.user, ["admin", "receptionist"]);
      const tech = () => {
        allow(r.user, ["technician"]);
        if (a.technician_id !== r.user.id) throw new ForbiddenException();
      };
      let message = "";
      if (action === "confirm") {
        staff();
        state("pending");
        a.status = "confirmed";
        message = "Lịch đã được xác nhận.";
      } else if (action === "reject") {
        staff();
        state("pending", "confirmed", "reschedule_proposed");
        a.reason = text(b.reason, "Lý do");
        a.status = "rejected";
        message = `Lịch bị từ chối: ${a.reason}`;
      } else if (action === "cancel") {
        allow(r.user, ["customer", "admin", "receptionist"]);
        state("pending", "confirmed", "reschedule_proposed");
        const g = (await this.repository.findGarageForAction([a.garage_id], c))
          .rows[0];
        if (
          role === "customer" &&
          new Date(a.starts_at).getTime() - Date.now() <
            g.cancel_hours * 3600000
        )
          fail(`Chỉ được hủy trước ít nhất ${g.cancel_hours} giờ.`);
        a.reason = text(b.reason, "Lý do");
        a.status = "cancelled";
        message = `Lịch đã hủy: ${a.reason}`;
      } else if (action === "reschedule" || action === "propose") {
        allow(
          r.user,
          action === "propose" ? ["admin", "receptionist"] : ["customer"],
        );
        state("pending", "confirmed", "reschedule_proposed");
        const duration =
          (new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) /
          60000;
        const result = await this.slot(
          c,
          a.garage_id,
          b.starts_at,
          duration,
          a.vehicle_id,
          id,
        );
        if (
          role === "customer" &&
          new Date(a.starts_at).getTime() - Date.now() <
            result.g.cancel_hours * 3600000
        )
          fail("Đã quá thời hạn đổi lịch.");
        a.reason = text(b.reason, "Lý do");
        if (action === "propose") {
          a.proposed_at = result.date;
          a.status = "reschedule_proposed";
          message = "Gara đề xuất giờ mới. Vui lòng đồng ý hoặc từ chối.";
        } else {
          a.starts_at = result.date;
          a.ends_at = result.end;
          a.status = "pending";
          a.proposed_at = null;
          message = "Khách yêu cầu đổi lịch. Chờ xác nhận lại.";
        }
      } else if (action === "accept_time") {
        allow(r.user, ["customer"]);
        state("reschedule_proposed");
        const result = await this.slot(
          c,
          a.garage_id,
          a.proposed_at,
          (new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) /
            60000,
          a.vehicle_id,
          id,
        );
        a.starts_at = result.date;
        a.ends_at = result.end;
        a.proposed_at = null;
        a.status = "confirmed";
        message = "Khách đã đồng ý giờ hẹn mới.";
      } else if (action === "decline_time") {
        allow(r.user, ["customer"]);
        state("reschedule_proposed");
        a.proposed_at = null;
        a.status = "pending";
        a.reason = text(b.reason, "Lý do");
        message = "Khách từ chối giờ mới; lịch cũ đang chờ gara xác nhận lại.";
      } else if (action === "receive") {
        staff();
        state("confirmed");
        a.condition = text(b.condition, "Tình trạng xe", 2000);
        const km = integer(b.odometer, "Số km", 0, 10000000);
        const v = (
          await this.repository.lockVehicleForReceipt([a.vehicle_id], c)
        ).rows[0];
        if (km < v.odometer) fail("Số km không được giảm.");
        await this.repository.updateOdometer([km, a.vehicle_id], c);
        a.status = "received";
        message = "Gara đã tiếp nhận xe.";
      } else if (action === "assign") {
        staff();
        state("received", "assigned");
        const technicianId = integer(b.technician_id, "Kỹ thuật viên", 1);
        const t = (
          await this.repository.lockActiveTechnician([technicianId], c)
        ).rows[0];
        if (!t) fail("Kỹ thuật viên không khả dụng.");
        const busy = await this.repository.findTechnicianOverlaps(
          [technicianId, id, a.ends_at, a.starts_at],
          c,
        );
        if (busy.rowCount) fail("Kỹ thuật viên có công việc trùng thời gian.");
        a.technician_id = technicianId;
        a.status = "assigned";
        message = `Đã phân công ${t.name}.`;
      } else if (action === "accept") {
        tech();
        state("assigned");
        a.status = "accepted";
        message = "Kỹ thuật viên đã nhận việc.";
      } else if (action === "start") {
        tech();
        state("accepted");
        a.status = "in_progress";
        message = "Xe đang được bảo dưỡng.";
      } else if (action === "checklist") {
        tech();
        state("in_progress");
        if (
          !Array.isArray(b.checked) ||
          b.checked.length !== a.checklist.length ||
          b.checked.some((v: any) => typeof v !== "boolean")
        )
          fail("Checklist không hợp lệ.");
        a.checklist = a.checklist.map((v: any, i: number) => ({
          ...v,
          done: b.checked[i],
        }));
        message = "Đã cập nhật checklist.";
      } else if (action === "condition") {
        tech();
        state("accepted", "in_progress");
        a.condition = text(b.condition, "Tình trạng", 2000);
        message = "Đã cập nhật tình trạng xe.";
      } else if (action === "extra") {
        allow(r.user, ["technician", "receptionist", "admin"]);
        state("received", "assigned", "accepted", "in_progress");
        await this.repository.insertExtra(
          [
            id,
            text(b.description, "Hạng mục phát sinh"),
            integer(b.amount, "Chi phí", 0, 100000000),
          ],
          c,
        );
        message = "Có đề xuất chi phí phát sinh cần khách duyệt.";
      } else if (action === "approve_extra" || action === "reject_extra") {
        allow(r.user, ["customer"]);
        state("received", "assigned", "accepted", "in_progress");
        const result = await this.repository.resolveExtra(
          [
            action === "approve_extra" ? "approved" : "rejected",
            integer(b.extra_id, "ID", 1),
            id,
          ],
          c,
        );
        if (!result.rowCount) fail("Đề xuất không còn chờ duyệt.");
        message =
          action === "approve_extra"
            ? "Khách đã đồng ý chi phí phát sinh."
            : "Khách đã từ chối chi phí phát sinh.";
      } else if (action === "photo") {
        tech();
        state("accepted", "in_progress");
        if (!["before", "after"].includes(b.kind)) fail("Chọn ảnh trước/sau.");
        const existing = (await this.repository.listPhotos([id], c)).rows;
        if (existing.some((p) => p.kind === b.kind))
          fail(
            "Mục ảnh này đã được tải lên. Vui lòng tải lại lịch để xem ảnh.",
          );
        const images = b.images === undefined ? [b.data] : b.images;
        if (!Array.isArray(images) || !images.length || images.length > 10)
          fail("Vui lòng chọn một nhóm ảnh hợp lệ.");
        const validated = images.map(imageData);
        for (const data of [...new Set(validated)])
          await this.repository.insertPhoto([id, b.kind, data], c);
        message = "Đã thêm hình ảnh xe.";
      } else if (action === "photo_update" || action === "photo_delete") {
        tech();
        state("accepted", "in_progress");
        const photoId = integer(b.photo_id, "Ảnh", 1);
        const result =
          action === "photo_update"
            ? await this.repository.updatePhoto(
                [imageData(b.data), photoId, id],
                c,
              )
            : await this.repository.deletePhoto([photoId, id], c);
        if (!result.rowCount)
          fail("Không tìm thấy ảnh trong lịch này. Vui lòng tải lại.");
        message =
          action === "photo_update"
            ? "Đã thay hình ảnh xe."
            : "Đã xóa hình ảnh xe.";
      } else if (action === "finish") {
        tech();
        state("in_progress");
        if (!a.checklist.length || a.checklist.some((v: any) => !v.done))
          fail("Hoàn tất checklist trước khi kết thúc.");
        if ((await this.repository.findPendingExtras([id], c)).rowCount)
          fail("Còn chi phí phát sinh chưa được khách duyệt.");
        const photos = (await this.repository.listPhotos([id], c)).rows;
        if (
          !photos.some((photo) => photo.kind === "before") ||
          !photos.some((photo) => photo.kind === "after")
        )
          fail("Cần có ảnh trước và ảnh sau bảo dưỡng trước khi hoàn thành.");
        a.status = "ready";
        message = "Bảo dưỡng hoàn tất. Xe sẵn sàng bàn giao.";
      } else if (action === "payment") {
        staff();
        state("ready");
        if (typeof b.paid !== "boolean")
          fail("Trạng thái thanh toán không hợp lệ.");
        a.paid = b.paid;
        message = a.paid
          ? "Đã ghi nhận thanh toán."
          : "Đã chuyển trạng thái chưa thanh toán.";
      } else if (action === "handover") {
        staff();
        state("ready");
        if (!a.paid) fail("Cần ghi nhận thanh toán trước khi bàn giao.");
        a.status = "completed";
        a.completed_at = new Date();
        message = "Đã bàn giao xe. Cảm ơn bạn đã sử dụng dịch vụ.";
      } else if (action === "review") {
        allow(r.user, ["customer"]);
        state("completed");
        await this.repository.insertReview(
          [
            id,
            integer(b.rating, "Số sao", 1, 5),
            text(b.comment, "Nhận xét", 2000, false),
          ],
          c,
        );
        message = "Đã ghi nhận đánh giá của bạn.";
      } else if (action === "message") {
        staff();
        message = text(b.message, "Thông báo", 1000);
      } else fail("Thao tác không được hỗ trợ.");
      const extraTotal = Number(
        (await this.repository.sumApprovedExtras([id], c)).rows[0].total,
      );
      a.total =
        a.services.reduce((n: number, s: any) => n + s.price, 0) + extraTotal;
      await this.repository.updateAppointment(
        [
          a.status,
          a.starts_at,
          a.ends_at,
          a.technician_id,
          a.condition,
          a.reason,
          a.proposed_at,
          a.paid,
          a.total,
          JSON.stringify(a.checklist),
          a.completed_at,
          id,
        ],
        c,
      );
      await this.repository.insertEvent([id, r.user.id, action, message], c);
      if (
        !["checklist", "photo", "photo_update", "photo_delete"].includes(action)
      )
        await this.notify(c, a, `#${id}: ${message}`);
      if (role === "customer" || action === "finish")
        await this.repository.notifyStaffOfAction(
          [id, `#${id}: ${message}`],
          c,
        );
      return { ok: true, message, appointment: a };
    });
  }
}
