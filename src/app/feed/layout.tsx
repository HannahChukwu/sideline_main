import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth/serverAuth";

export default async function FeedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?role=student&next=/feed");
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "student") {
    if (role === "designer") redirect("/designer");
    if (role === "athlete") redirect("/athlete");
    redirect("/auth");
  }

  return <>{children}</>;
}
