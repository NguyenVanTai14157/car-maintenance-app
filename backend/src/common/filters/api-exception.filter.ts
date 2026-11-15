import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";

const safeReasons = new Set([
  "Biển số không hợp lệ.",
  "Số km không hợp lệ.",
  "Số km hiện tại không được giảm.",
  "Năm sản xuất không hợp lệ.",
  "Vui lòng nhập hãng xe.",
  "Vui lòng nhập dòng xe.",
  "Hãng xe quá dài. Vui lòng nhập ngắn gọn hơn.",
  "Dòng xe quá dài. Vui lòng nhập ngắn gọn hơn.",
  "Biển số quá dài. Vui lòng nhập ngắn gọn hơn.",
  "Ghi chú quá dài. Vui lòng nhập ngắn gọn hơn.",
  "Nhóm ảnh không hợp lệ.",
  "Ảnh phải là JPEG/PNG và nhỏ hơn 2 MB.",
]);
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  catch(error: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (error instanceof HttpException) {
      res.locals.logErrorCode = `HTTP_${error.getStatus()}`;
      const body = error.getResponse();
      const message = typeof body === "string" ? body : (body as { message?: unknown }).message;
      if (typeof message === "string" && safeReasons.has(message))
        res.locals.logErrorReason = message;
      else if (error.getStatus() === 400)
        res.locals.logErrorReason = "Yêu cầu không đạt điều kiện kiểm tra dữ liệu.";
      return res.status(error.getStatus()).json({
        message,
      });
    }
    const code = error?.code;
    res.locals.logErrorCode =
      typeof code === "string" && /^[A-Z0-9]{5}$/.test(code)
        ? `DB_${code}`
        : "INTERNAL_ERROR";
    if (code === "23505") {
      res.locals.logErrorReason = error.constraint === "vehicles_owner_plate"
        ? "Biển số đã có trong tài khoản."
        : "Dữ liệu trùng với thông tin đã lưu.";
      return res.status(409).json({
        message:
          "Thông tin đã tồn tại (email, SĐT, biển số hoặc tên hạng mục).",
      });
    }
    if (["23503", "22P02", "23514"].includes(code))
      return res
        .status(400)
        .json({ message: "Dữ liệu tham chiếu không hợp lệ." });
    this.logger.error(
      `${res.locals.logErrorCode} - request ${res.getHeader("X-Request-Id") ?? "unknown"}`,
    );
    return res
      .status(500)
      .json({ message: "Không thể xử lý lúc này. Vui lòng thử lại." });
  }
}
