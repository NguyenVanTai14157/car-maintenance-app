import { requireAdmin } from "@/lib/server";
import { Shell } from "@/components/shell";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  return <Shell user={user}>{children}</Shell>;
}
