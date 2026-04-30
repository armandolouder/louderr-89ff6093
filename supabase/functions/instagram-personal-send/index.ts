import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IG_BASE = "https://i.instagram.com/api/v1";
const IG_USER_AGENT = "Instagram 269.0.0.18.75 Android (28/9; 480dpi; 1080x2137; OnePlus; ONEPLUS A6003; OnePlus6; qcom; pt_BR; 314665256)";

interface SendBody {
  thread_id?: string;
  ig_user_id?: string;
  username?: string;
  text: string;
}

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
    "X-IG-Capabilities": "3brTvw==",
    "X-IG-Connection-Type": "WIFI",
    "Accept-Language": "pt-BR, en-US",
  };
  if (csrftoken) h["X-CSRFToken"] = csrftoken;
  return h;
}

async function resolveUserId(username: string, cookie: string, csrftoken?: string): Promise<string | null> {
  const url = `${IG_BASE}/users/web_profile_info/?username=${encodeURIComponent(username)}`;
  const r = await fetch(url, { headers: igHeaders(cookie, csrftoken) });
  if (!r.ok) return null;
  const j = await r.json();
  return j?.data?.user?.id ?? null;
}

async function sendDirect({
  cookie,
  csrftoken,
  text,
  thread_id,
  recipient_id,
}: {
  cookie: string;
  csrftoken?: string;
  text: string;
  thread_id?: string;
  recipient_id?: string;
}) {
  const form = new URLSearchParams();
  form.set("action", "send_item");
  form.set("client_context", crypto.randomUUID());
  form.set("text", text);
  if (thread_id) {
    form.set("thread_ids", `[${thread_id}]`);
  } else if (recipient_id) {
    form.set("recipient_users", `[[${recipient_id}]]`);
  }

  const r = await fetch(`${IG_BASE}/direct_v2/threads/broadcast/text/`, {
    method: "POST",
    headers: {
      ...igHeaders(cookie, csrftoken),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !user) {
      return new Response(JSON.stringify({ success: false, error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as SendBody;
    if (!body?.text || typeof body.text !== "string" || !body.text.trim()) {
      return new Response(JSON.stringify({ success: false, error: "Texto vazio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!body.thread_id && !body.ig_user_id && !body.username) {
      return new Response(
        JSON.stringify({ success: false, error: "Forneça thread_id, ig_user_id ou username" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: cred, error: credErr } = await supabase
      .from("instagram_personal_credentials")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (credErr || !cred) {
      return new Response(
        JSON.stringify({ success: false, error: "Credenciais não configuradas. Acesse Conexões → Instagram Pessoal." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (cred.status === "expired") {
      return new Response(
        JSON.stringify({ success: false, error: "Cookie expirado. Reextraia o sessionid e atualize." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cookie = buildCookieHeader(cred.sessionid, cred.csrftoken, cred.ds_user_id);

    let recipient_id = body.ig_user_id ?? null;
    if (!body.thread_id && !recipient_id && body.username) {
      recipient_id = await resolveUserId(body.username, cookie, cred.csrftoken);
      if (!recipient_id) {
        return new Response(
          JSON.stringify({ success: false, error: `Usuário @${body.username} não encontrado` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const result = await sendDirect({
      cookie,
      csrftoken: cred.csrftoken ?? undefined,
      text: body.text,
      thread_id: body.thread_id ?? undefined,
      recipient_id: recipient_id ?? undefined,
    });

    // Detecta cookie expirado
    if (result.status === 401 || result.status === 403 ||
        result.data?.message === "login_required" ||
        result.data?.error_type === "login_required") {
      await supabase
        .from("instagram_personal_credentials")
        .update({ status: "expired", error_message: "login_required" })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Cookie expirado. Faça login novamente no Instagram pelo navegador e cole o novo sessionid.",
          expired: true,
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (result.data?.message === "checkpoint_required") {
      await supabase
        .from("instagram_personal_credentials")
        .update({ status: "checkpoint", error_message: "checkpoint_required" })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Instagram pediu verificação (checkpoint). Abra o app/site, confirme que é você, e tente de novo.",
          checkpoint: true,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!result.ok || result.data?.status !== "ok") {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.data?.message || `Falha ao enviar (status ${result.status})`,
          raw: result.data,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Atualiza last_verified
    await supabase
      .from("instagram_personal_credentials")
      .update({ last_verified_at: new Date().toISOString(), status: "active", error_message: null })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        success: true,
        thread_id: result.data?.payload?.thread_id ?? body.thread_id,
        message_id: result.data?.payload?.item_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("instagram-personal-send error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});