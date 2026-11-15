import { Controller, Get, Query, SetMetadata, Sse } from "@nestjs/common";
import { interval, map, merge, of, takeUntil, timer } from "rxjs";
import { adminChanges } from "../../common/admin-changes";
import { fail, integer, text } from "../../common/validation/input";
import { db } from "../../database/connection";

@Controller("admin/system-logs")
@SetMetadata("adminOnly", true)
export class SystemLogsController {
  @Sse("events")
  events() {
    return merge(
      of({ data: ["*"] }),
      adminChanges.pipe(map((resources) => ({ data: resources }))),
      interval(15000).pipe(map(() => ({ data: [] }))),
    ).pipe(takeUntil(timer(45000)));
  }

  @Get()
  async list(
    @Query("kind") kind: string = "activity",
    @Query("q") search?: string,
    @Query("page") pageValue?: string,
    @Query("status") statusValue?: string,
  ) {
    if (kind !== "activity" && kind !== "error") fail("Loại nhật ký không hợp lệ.");
    const page = integer(pageValue ?? 1, "Trang", 1, 100000);
    const term = text(search, "Từ khóa", 120, false).toLowerCase();
    const status = statusValue ? integer(statusValue, "Mã HTTP", 100, 599) : null;
    const pageSize = 20;
    const filters = `WHERE kind = $1
      AND ($2::text = '' OR strpos(lower(concat_ws(' ', actor_email, actor_id::text,
        method, endpoint, request_id::text, error_code, resource_id)), $2) > 0)
      AND ($3::int IS NULL OR status = $3)`;
    const params = [kind, term, status];
    const [count, rows] = await Promise.all([
      db.query(`SELECT count(*)::int AS total FROM system_logs ${filters}`, params),
      db.query(`SELECT * FROM system_logs ${filters} ORDER BY id DESC LIMIT $4 OFFSET $5`,
        [...params, pageSize, (page - 1) * pageSize]),
    ]);
    return { items: rows.rows, total: count.rows[0].total, page, page_size: pageSize };
  }
}
