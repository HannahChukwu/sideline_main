import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth/serverAuth";

export default async function DesignerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?role=designer&next=/designer");
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "designer") {
    if (role === "athlete") redirect("/athlete");
    if (role === "student") redirect("/feed");
    redirect("/auth");
  }

  return <>{children}</>;
}
