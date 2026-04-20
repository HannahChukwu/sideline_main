import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?mode=signin&next=/settings");
  }

  return <>{children}</>;
}
