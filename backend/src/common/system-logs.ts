import { Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { db } from "../database/connection";

const logger = new Logger("SystemLogs");
const personalWrites = /^\/(vehicles|plans|records|categories|settings|backup|notifications)(\/|$)/;
type LogRequest = Request & {
  user?: { id: number; email?: string; role: string };
};

export function captureSystemLog(req: LogRequest, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = randomUUID();
  res.setHeader("X-Request-Id", requestId);
  res.once("finish", () => {
    const route = req.route?.path;
    const endpoint = typeof route === "string" ? route : null;
    if (endpoint === "/health" || endpoint?.startsWith("/admin/system-logs")) return;
    const status = res.statusCode;
    const user = req.user;
    const isWrite = ["POST", "PATCH", "PUT", "DELETE"].includes(req.method);
    const isActivity = status >= 200 && status < 300 && user?.role === "user"
      && isWrite && endpoint && personalWrites.test(endpoint);
    if (status < 400 && !isActivity) return;
    const id = res.locals.logResourceId ?? req.params?.id;
    const resourceId = /^\d{1,16}$/.test(String(id)) ? String(id) : null;
    void db.query(
      `INSERT INTO system_logs
        (kind, request_id, actor_id, actor_email, method, endpoint, resource_id, status, duration_ms, error_code, error_reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [isActivity ? "activity" : "error", requestId, user?.id ?? null, user?.email ?? null,
        req.method, endpoint ?? "(chưa xác định tuyến API)", resourceId, status,
        Date.now() - start, res.locals.logErrorCode ?? null, res.locals.logErrorReason ?? null],
    ).catch(() => logger.warn(`Không lưu được nhật ký cho yêu cầu ${requestId}`));
  });
  next();
}
