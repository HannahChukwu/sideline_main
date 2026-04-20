import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptString } from "@/lib/instagram/tokenCrypto";
import { canManageTeam, getUserRole } from "@/lib/auth/serverAuth";

type MediaType = "FEED" | "STORIES";

type PublishBody = {
  teamId: string;
  imageUrl: string;
  caption?: string;
  mediaType?: MediaType;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 401 });
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const role = await getUserRole(supabase, user.id);
  if (role !== "designer") {
    return NextResponse.json({ error: "Only designer accounts can publish to Instagram." }, { status: 403 });
  }

  const body = (await request.json()) as Partial<PublishBody>;
  const teamId = body.teamId;
  const imageUrl = body.imageUrl;
  const mediaType: MediaType = body.mediaType === "STORIES" ? "STORIES" : "FEED";
  const caption = typeof body.caption === "string" ? body.caption : "";

  if (!teamId || typeof teamId !== "string") {
    return NextResponse.json({ error: "Missing teamId" }, { status: 400 });
  }
  const allowed = await canManageTeam(supabase, user.id, teamId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden team access." }, { status: 403 });
  }
  if (!imageUrl || typeof imageUrl !== "string") {
    return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
  }
  if (!imageUrl.startsWith("https://")) {
    return NextResponse.json(
      { error: "imageUrl must be a public https URL (Instagram cannot fetch blob: or http: URLs)." },
      { status: 400 }
    );
  }

  if (mediaType === "FEED") {
    if (caption.length > 2200) {
      return NextResponse.json({ error: "Caption must be <= 2200 characters" }, { status: 400 });
    }
  }

  const { data: account, error: accountErr } = await supabase
    .from("team_instagram_accounts")
    .select("ig_user_id, access_token_encrypted")
    .eq("team_id", teamId)
    .maybeSingle();

  if (accountErr || !account) {
    return NextResponse.json(
      { error: "Instagram not connected for this team. Connect it from the designer flow." },
      { status: 400 }
    );
  }

  const igUserId = account.ig_user_id;
  const accessToken = decryptString(account.access_token_encrypted);

  const mediaUrl = `https://graph.facebook.com/v19.0/${igUserId}/media`;
  const mediaParams = new URLSearchParams({
    image_url: imageUrl,
    access_token: accessToken,
  });

  if (mediaType === "STORIES") {
    mediaParams.set("media_type", "STORIES");
  } else {
    mediaParams.set("caption", caption);
  }

  const mediaRes = await fetch(mediaUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: mediaParams,
  });

  if (!mediaRes.ok) {
    const text = await mediaRes.text().catch(() => "");
    return NextResponse.json(
      { error: `Failed to create media container: ${mediaRes.status} ${text}` },
      { status: 500 }
    );
  }

  const mediaJson = (await mediaRes.json()) as { id?: string };
  const creationId = mediaJson.id;
  if (!creationId) {
    return NextResponse.json({ error: "Media container creation returned no id" }, { status: 500 });
  }

  const publishUrl = `https://graph.facebook.com/v19.0/${igUserId}/media_publish`;
  const publishRes = await fetch(publishUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      creation_id: creationId,
      access_token: accessToken,
    }),
  });

  if (!publishRes.ok) {
    const text = await publishRes.text().catch(() => "");
    return NextResponse.json(
      { error: `Failed to publish: ${publishRes.status} ${text}` },
      { status: 500 }
    );
  }

  const publishJson = (await publishRes.json()) as { id?: string };
  return NextResponse.json({
    ok: true,
    media_type: mediaType,
    creation_id: creationId,
    publish_id: publishJson.id ?? null,
  });
}
