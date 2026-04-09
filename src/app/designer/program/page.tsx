import { redirect } from "next/navigation";

/** Legacy URL — program setup lives on the Team tab. */
export default function LegacyProgramPage() {
  redirect("/designer/team");
}
