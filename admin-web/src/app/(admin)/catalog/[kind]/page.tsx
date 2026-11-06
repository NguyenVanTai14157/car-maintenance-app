import { notFound } from "next/navigation";
import { CatalogManager } from "@/components/catalog-manager";
import type { CatalogKind } from "@/lib/types";
export default async function CatalogPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  if (!["brands", "models", "types"].includes(kind)) notFound();
  return <CatalogManager key={kind} kind={kind as CatalogKind} />;
}
