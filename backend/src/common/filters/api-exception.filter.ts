import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  catch(error: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (error instanceof HttpException) {
      const body = error.getResponse();
      return res.status(error.getStatus()).json({
        message: typeof body === "string" ? body : (body as any).message,
      });
    }
    if (error.code === "23505")
      return res.status(409).json({
        message:
          "Thông tin đã tồn tại (email, SĐT, biển số hoặc tên hạng mục).",
      });
    if (["23503", "22P02", "23514"].includes(error.code))
      return res
        .status(400)
        .json({ message: "Dữ liệu tham chiếu không hợp lệ." });
    this.logger.error(error.code || error.name);
    return res
      .status(500)
      .json({ message: "Không thể xử lý lúc này. Vui lòng thử lại." });
  }
}
