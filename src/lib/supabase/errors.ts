/** Human-readable message from Supabase / PostgREST / network failures. */
export function formatSupabaseError(err: unknown): string {
  if (typeof err === "object" && err !== null) {
    const o = err as Record<string, unknown>;
    const msg = o.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
    const details = o.details;
    if (typeof details === "string" && details.trim()) return details.trim();
    const hint = o.hint;
    if (typeof hint === "string" && hint.trim()) return hint.trim();
    const code = o.code;
    if (typeof code === "string" && code.startsWith("PGRST"))
      return `Database error (${code}). Check Row Level Security policies and that you are signed in.`;
  }
  if (err instanceof Error && err.message.trim()) return err.message.trim();
  return "Something went wrong. Make sure you are signed in and try again.";
}
