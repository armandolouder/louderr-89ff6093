import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IG_BASE = "https://i.instagram.com/api/v1";
const IG_USER_AGENT = "Instagram 269.0.0.18.75 Android (28/9; 480dpi; 1080x2137; OnePlus; ONEPLUS A6003; OnePlus6; qcom; pt_BR; 314665256)";

function buildCookieHeader(sessionid: string, csrftoken?: string, ds_user_id?: string) {
  const parts = [`sessionid=${sessionid}`];
  if (csrftoken) parts.push(`csrftoken=${csrftoken}`);
  if (ds_user_id) parts.push(`ds_user_id=${ds_user_id}`);
  return parts.join("; ");
}

function igHeaders(cookie: string, csrftoken?: string) {
  const h: Record<string, string> = {
    "User-Agent": IG_USER_AGENT,
    "Cookie": cookie,
    "X-IG-App-ID": "936619743392459",
    "Accept-Language": "pt-BR, en-US",
  };
  if (csrftoken) h["X-CSRFToken"] = csrftoken;
  return h;
}

async function fetchInbox(cookie: string, csrftoken?: string) {
  const attempts = [
    `${IG_BASE}/direct_v2/inbox/?limit=20&thread_message_limit=10`,
    `${IG_BASE}/direct_v2/inbox/?limit=20&thread_message_limit=10&folder=&seq_id=0`,
    `${IG_BASE}/direct_v2/inbox/?visual_message_return_type=unseen&thread_message_limit=10&persistentBadging=true&limit=20`,
  ];

  const failures: Array<{ status: number; body: string; url: string }> = [];

  for (const url of attempts) {
    const response = await fetch(url, { headers: igHeaders(cookie, csrftoken) });
    const rawBody = await response.text();
    console.log(`[IG-FETCH] attempt url=${url} status=${response.status} body_preview=${rawBody.slice(0, 400)}`);

    let parsed: any = null;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      parsed = null;
    }

    if (response.ok && parsed?.status === "ok" && parsed?.inbox) {
      return { ok: true as const, response, parsed, rawBody, url };
    }

    failures.push({ status: response.status, body: rawBody, url });

    if (response.status === 401 || response.status === 403) {
      return { ok: false as const, response, parsed, rawBody, url, authError: true, failures };
    }
  }

  const last = failures[failures.length - 1];
  return {
    ok: false as const,
    response: null,
    parsed: null,
    rawBody: last?.body ?? "",
    url: last?.url ?? attempts[0],
    authError: false,
    failures,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Pode ser chamada manualmente (com auth) ou por cron (sem auth → busca todos)
    const authHeader = req.headers.get("Authorization");
    let targetUserId: string | null = null;

    if (authHeader && !authHeader.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "___")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user) targetUserId = user.id;
    }

    let query = supabase
      .from("instagram_personal_credentials")
      .select("*")
      .eq("status", "active");
    if (targetUserId) query = query.eq("user_id", targetUserId);

    const { data: creds, error: credErr } = await query;
    if (credErr) throw credErr;

    const results: any[] = [];

    for (const cred of creds ?? []) {
      try {
        const cookie = buildCookieHeader(cred.sessionid, cred.csrftoken, cred.ds_user_id);
        console.log(`[IG-FETCH] user=${cred.user_id} ig_user_id=${cred.ig_user_id} sid_len=${cred.sessionid?.length} csrf_len=${cred.csrftoken?.length}`);
        const inboxResult = await fetchInbox(cookie, cred.csrftoken);

        if (inboxResult.authError) {
          await supabase
            .from("instagram_personal_credentials")
            .update({ status: "expired", error_message: `login_required: ${inboxResult.rawBody.slice(0, 200)}` })
            .eq("user_id", cred.user_id);
          results.push({ user_id: cred.user_id, error: "expired" });
          continue;
        }

        if (!inboxResult.ok) {
          const lastFailure = inboxResult.failures[inboxResult.failures.length - 1];
          let parsedError: any = null;
          try {
            parsedError = JSON.parse(lastFailure?.body ?? "");
          } catch {
            parsedError = null;
          }

          const igStatus = parsedError?.status_code || lastFailure?.status || "unknown";
          const igErrorCode = parsedError?.content?.error_code || parsedError?.error_code || "unknown";
          const igMessage = parsedError?.content?.status || parsedError?.message || lastFailure?.body?.slice(0, 160) || "Falha ao ler inbox";

          await supabase
            .from("instagram_personal_credentials")
            .update({
              status: "checkpoint",
              error_message: `Instagram bloqueou a leitura da inbox (${igStatus}/${igErrorCode}): ${igMessage}`,
            })
            .eq("user_id", cred.user_id);

          console.error(`[IG-FETCH] failed after ${inboxResult.failures.length} attempt(s)`);
          results.push({
            user_id: cred.user_id,
            error: "instagram_blocked",
            status: igStatus,
            error_code: igErrorCode,
            message: igMessage,
          });
          continue;
        }

        const j = inboxResult.parsed;
        const threads = j?.inbox?.threads ?? [];
        console.log(`[IG-FETCH] threads_count=${threads.length} viewer=${j?.viewer?.pk} status=${j?.status}`);
        let newMessages = 0;

        for (const thread of threads) {
          const igThreadId = thread.thread_id;
          const otherUser = thread.users?.[0];
          if (!otherUser) continue;

          const contactName = otherUser.full_name || otherUser.username || "Sem nome";
          const igUsername = otherUser.username;
          const igUserId = otherUser.pk_id || String(otherUser.pk);

          // upsert contato
          let { data: contact } = await supabase
            .from("contacts")
            .select("id")
            .eq("user_id", cred.user_id)
            .eq("instagram_id", igUserId)
            .maybeSingle();

          if (!contact) {
            const { data: newContact } = await supabase
              .from("contacts")
              .insert({
                user_id: cred.user_id,
                name: contactName,
                instagram_id: igUserId,
                avatar_url: otherUser.profile_pic_url,
                tags: ["instagram-pessoal"],
                notes: `@${igUsername}`,
              })
              .select("id")
              .single();
            contact = newContact;
          }
          if (!contact) continue;

          // upsert conversa
          let { data: conv } = await supabase
            .from("conversations")
            .select("id, last_message_at")
            .eq("user_id", cred.user_id)
            .eq("contact_id", contact.id)
            .eq("channel", "instagram-personal")
            .maybeSingle();

          if (!conv) {
            const { data: newConv } = await supabase
              .from("conversations")
              .insert({
                user_id: cred.user_id,
                contact_id: contact.id,
                channel: "instagram-personal",
                status: "novo",
                unread_count: 0,
              })
              .select("id, last_message_at")
              .single();
            conv = newConv;
          }
          if (!conv) continue;

          // processa items (mais recentes primeiro)
          const items = (thread.items ?? []).slice().reverse();
          for (const item of items) {
            if (item.item_type !== "text") continue; // só texto por enquanto
            const itemId = String(item.item_id);
            const isFromMe = String(item.user_id) === cred.ig_user_id;

            // dedup por item_id no metadata
            const { data: existing } = await supabase
              .from("messages")
              .select("id")
              .eq("conversation_id", conv.id)
              .eq("metadata->>ig_item_id", itemId)
              .maybeSingle();

            if (existing) continue;

            const sentAt = new Date(Number(item.timestamp) / 1000).toISOString();

            await supabase.from("messages").insert({
              user_id: cred.user_id,
              conversation_id: conv.id,
              sender_type: isFromMe ? "agent" : "contact",
              content: item.text ?? "",
              message_type: "text",
              status: "delivered",
              created_at: sentAt,
              metadata: { ig_item_id: itemId, ig_thread_id: igThreadId, source: "instagram-personal" },
            });

            if (!isFromMe) newMessages++;

            await supabase
              .from("conversations")
              .update({
                last_message: item.text ?? "",
                last_message_at: sentAt,
                unread_count: isFromMe ? 0 : undefined,
              })
              .eq("id", conv.id);
          }

          // contador de não lidas (incremental)
          if (newMessages > 0) {
            await supabase.rpc("increment_campaign_sent", { campaign_id_param: conv.id }).catch(() => {});
          }
        }

        await supabase
          .from("instagram_personal_credentials")
          .update({ last_inbox_check_at: new Date().toISOString(), status: "active" })
          .eq("user_id", cred.user_id);

        results.push({ user_id: cred.user_id, threads: threads.length, new: newMessages });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`fetch error for user ${cred.user_id}:`, msg);
        results.push({ user_id: cred.user_id, error: msg });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("instagram-personal-fetch error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});