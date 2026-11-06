import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  NotFoundException,
} from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import type { CatalogKind } from "./catalog.repository";
import type { PageQuery } from "../admin/dto/input.dto";
export function catalogKind(value: string): CatalogKind {
  if (!["brands", "models", "types"].includes(value))
    throw new NotFoundException("Không có danh mục này.");
  return value as CatalogKind;
}
@Controller("catalog")
export class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly service: CatalogService,
  ) {}
  @Get(":kind") list(@Param("kind") kind: string, @Query() q: PageQuery) {
    return this.service.list(catalogKind(kind), q, true);
  }
}
