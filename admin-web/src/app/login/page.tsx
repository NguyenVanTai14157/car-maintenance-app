import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/server";
import { LoginForm } from "@/components/login-form";
export default async function LoginPage() {
  let user = null;
  try {
    user = await currentAdmin();
  } catch {}
  if (user) redirect("/");
  return <LoginForm />;
}
