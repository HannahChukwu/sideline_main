import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth/serverAuth";

export default async function AthleteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?role=athlete&next=/athlete");
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "athlete") {
    if (role === "designer") redirect("/designer");
    if (role === "student") redirect("/feed");
    redirect("/auth");
  }

  return <>{children}</>;
}
