import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY não está configurada");

    const { messageId } = await req.json();
    if (!messageId) throw new Error("messageId é obrigatório");

    const service = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: message, error: msgError } = await service
      .from("messages")
      .select("id, media_url, metadata")
      .eq("id", messageId)
      .single();
    if (msgError || !message) throw new Error("Mensagem não encontrada");

    // Return cached transcription if present
    if (message.metadata?.transcription) {
      return new Response(JSON.stringify({ transcription: message.metadata.transcription, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!message.media_url) throw new Error("Mensagem não possui áudio");

    // Resolve the audio bytes
    let audioBytes: Uint8Array;
    let fileName = "audio.ogg";
    if (message.media_url.startsWith("whatsapp-media:")) {
      const path = message.media_url.replace("whatsapp-media:", "");
      fileName = path.split("/").pop() || fileName;
      const { data: blob, error: dlError } = await service.storage.from("whatsapp-media").download(path);
      if (dlError || !blob) throw new Error("Falha ao baixar o áudio");
      audioBytes = new Uint8Array(await blob.arrayBuffer());
    } else {
      const res = await fetch(message.media_url);
      if (!res.ok) throw new Error("Falha ao baixar o áudio");
      audioBytes = new Uint8Array(await res.arrayBuffer());
    }

    // Send to Groq Whisper
    const form = new FormData();
    form.append("file", new Blob([audioBytes]), fileName);
    form.append("model", "whisper-large-v3-turbo");
    form.append("language", "pt");
    form.append("response_format", "json");

    const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: form,
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq transcription error:", groqRes.status, errText);
      if (groqRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`Erro na transcrição (${groqRes.status})`);
    }

    const result = await groqRes.json();
    const transcription = (result.text || "").trim();

    await service.from("messages").update({
      metadata: { ...(message.metadata || {}), transcription },
    }).eq("id", messageId);

    return new Response(JSON.stringify({ transcription }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("transcribe-audio error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});