import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { allow, imageData, integer, text, fail } from "../../common/validation/input";
import { onlyFields } from "../admin/admin.rules";
import { BannersRepository } from "./banners.repository";

const targets = ["/plans", "/record-edit", "/vehicles"] as const;
export const bannerUploadDir = resolve(
  process.env.BANNER_UPLOAD_DIR || join(__dirname, "../../../uploads/banners"),
);
const publicPrefix = "/uploads/banners/";

function input(b: any) {
  onlyFields(b, ["title", "action_text", "target_path", "position", "active", "image_data", "images"]);
  const title = text(b.title, "Tiêu đề", 100),
    action_text = text(b.action_text, "Nội dung nút", 60),
    target_path = text(b.target_path, "Màn hình đích", 40),
    position = integer(b.position ?? 0, "Thứ tự", 0, 1000),
    active = b.active === undefined ? true : b.active;
  if (!targets.includes(target_path as (typeof targets)[number]))
    fail("Màn hình đích không hợp lệ.");
  if (typeof active !== "boolean") fail("Trạng thái banner không hợp lệ.");
  return { title, action_text, target_path, position, active };
}

@Injectable()
export class BannersService {
  constructor(
    @Inject(BannersRepository) private readonly repo: BannersRepository,
  ) {}

  listAdmin() {
    return this.repo.list();
  }

  listActive() {
    return this.repo.list(true);
  }

  async create(actor: any, b: any) {
    allow(actor, ["admin"]);
    const data = input(b);
    const paths = await this.saveImages(b, true);
    try {
      return await this.repo.create(actor.id, { ...data, image_paths: paths });
    } catch (error) {
      await this.cleanup(paths);
      throw error;
    }
  }

  async update(actor: any, id: number, b: any) {
    allow(actor, ["admin"]);
    const data = input(b);
    const paths = await this.saveImages(b, false);
    const result = await this.repo.update(actor.id, id, {
      ...data,
      image_paths: paths.length ? paths : undefined,
    }).catch(async (error) => {
      await this.cleanup(paths);
      throw error;
    });
    if (paths.length) await this.cleanup(result.old.image_paths);
    return result.row;
  }

  async remove(actor: any, id: number) {
    allow(actor, ["admin"]);
    const old = await this.repo.remove(actor.id, id);
    await this.cleanup(old.image_paths);
    return { ok: true };
  }

  private async saveImages(body: any, required: boolean) {
    const values = body.images ?? (body.image_data === undefined ? undefined : [body.image_data]);
    if (values === undefined && !required) return [];
    if (!Array.isArray(values) || values.length < 1 || values.length > 8)
      fail("Chọn từ 1 đến 8 ảnh cho banner.");
    const paths: string[] = [];
    try {
      for (const value of values) paths.push((await this.saveImage(value)).path);
      return paths;
    } catch (error) {
      await this.cleanup(paths);
      throw error;
    }
  }

  private async cleanup(paths: string[]) {
    await Promise.allSettled(paths.map((path) => this.removeImage(path)));
  }

  private async saveImage(value: unknown) {
    const data = imageData(value),
      comma = data.indexOf(","),
      mime = data.slice(5, data.indexOf(";")),
      bytes = Buffer.from(data.slice(comma + 1), "base64");
    if (bytes.length > 2 * 1024 * 1024)
      fail("Ảnh banner phải nhỏ hơn 2 MB.");
    const isJpeg =
      mime === "image/jpeg" &&
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;
    const isPng =
      mime === "image/png" &&
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (!isJpeg && !isPng) fail("Tệp tải lên không phải ảnh JPEG hoặc PNG hợp lệ.");
    await mkdir(bannerUploadDir, { recursive: true });
    const name = randomUUID() + (isJpeg ? ".jpg" : ".png"),
      file = resolve(bannerUploadDir, name);
    await writeFile(file, bytes, { flag: "wx" });
    return { file, path: publicPrefix + name };
  }

  private async removeImage(path: string) {
    const name = path.startsWith(publicPrefix) ? path.slice(publicPrefix.length) : "";
    if (!/^[0-9a-f-]{36}\.(?:jpg|png)$/i.test(name)) return;
    await rm(resolve(bannerUploadDir, name), { force: true });
  }
}
