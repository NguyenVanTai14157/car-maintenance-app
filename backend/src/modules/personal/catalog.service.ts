import { CatalogService } from "../catalog/catalog.service";
import { Inject, Injectable } from "@nestjs/common";
import { fail, integer, text } from "../../common/validation/input";
import { PersonalRepository } from "./personal.repository";
import { vehicleInput, bool } from "./personal.rules";
@Injectable()
export class PersonalVehiclesService {
  constructor(
    @Inject(PersonalRepository) private readonly repo: PersonalRepository,
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}
  list(uid: number) {
    return this.repo.vehicles(uid);
  }
  save(uid: number, id: number | null, b: any) {
    return this.repo.transaction(uid, async (c) => {
      const old = id
        ? await this.repo.owned("vehicles", id, uid, c, true)
        : null;
      const resolved = await this.catalog.vehicleReferences(b, old, c);
      // Older clients only know the first photo. Preserve the rest of the gallery.
      if (old && b.images === undefined) {
        const previous = old.images?.length
          ? old.images
          : old.image
            ? [old.image]
            : [];
        resolved.images =
          b.image === undefined || b.image === old.image
            ? previous
            : [
                ...new Set([
                  ...(b.image ? [b.image] : []),
                  ...previous.slice(1),
                ]),
              ];
      }
      const data = {
        ...vehicleInput(resolved),
        brand_id: resolved.brand_id,
        model_id: resolved.model_id,
        type_id: resolved.type_id,
      };
      if (id) {
        if (data.odometer < old.odometer)
          fail("Số km hiện tại không được giảm.");
      }
      return this.repo.save("vehicles", uid, id, data, c);
    });
  }
  archive(uid: number, id: number, b: any) {
    const archived = bool(b.archived, "Trạng thái lưu trữ");
    return this.repo.transaction(uid, async (c) => {
      await this.repo.owned("vehicles", id, uid, c, true);
      return this.repo.save("vehicles", uid, id, { archived }, c);
    });
  }
  remove(uid: number, id: number) {
    return this.repo.transaction(uid, async (c) => {
      await this.repo.owned("vehicles", id, uid, c, true);
      if (await this.repo.usedVehicle(uid, id, c))
        fail("Xe có lịch hoặc lịch sử. Hãy lưu trữ xe để giữ dữ liệu.");
      await this.repo.remove("vehicles", id, uid, c);
      return { ok: true };
    });
  }
}
@Injectable()
export class CategoriesService {
  constructor(
    @Inject(PersonalRepository) private readonly repo: PersonalRepository,
  ) {}
  list(uid: number) {
    return this.repo.categories(uid);
  }
  save(uid: number, id: number | null, b: any) {
    const data = {
      name: text(b.name, "Tên hạng mục", 100),
      active: b.active === undefined ? true : bool(b.active, "Trạng thái"),
    };
    return this.repo.transaction(uid, async (c) => {
      if (id) await this.repo.owned("categories", id, uid, c, true);
      return this.repo.save("categories", uid, id, data, c);
    });
  }
  remove(uid: number, id: number) {
    return this.repo.transaction(uid, async (c) => {
      await this.repo.owned("categories", id, uid, c, true);
      if (await this.repo.usedCategory(uid, id, c))
        fail("Hạng mục đã được sử dụng. Hãy ngừng sử dụng để giữ lịch sử.");
      await this.repo.remove("categories", id, uid, c);
      return { ok: true };
    });
  }
}
