import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildPhoneCandidates(rawPhone: string) {
  let normalized = rawPhone.replace(/\D/g, "");

  if (normalized.length >= 10 && !normalized.startsWith("55")) {
    normalized = `55${normalized}`;
  }

  const candidates = new Set<string>([normalized]);

  if (normalized.startsWith("55") && normalized.length === 13 && normalized[4] === "9") {
    candidates.add(`${normalized.slice(0, 4)}${normalized.slice(5)}`);
  }

  if (normalized.startsWith("55") && normalized.length === 12) {
    candidates.add(`${normalized.slice(0, 4)}9${normalized.slice(4)}`);
  }

  return Array.from(candidates).filter(Boolean);
}

 import { sendWhatsAppText, sendWhatsAppMedia, hasWhatsAppCredentials } from "../_shared/whatsapp.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );

    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

     const authenticatedUserId = claimsData.claims.sub;
     const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
     const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 
     if (!hasWhatsAppCredentials()) {
       throw new Error("WhatsApp credentials not configured");
     }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { phone, content, mediaUrl } = await req.json();

    if (typeof phone !== "string" || typeof content !== "string" || !phone.trim() || !content.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "phone and content are required" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const phoneCandidates = buildPhoneCandidates(phone);
    console.log(`Sending individual message, candidates: ${phoneCandidates.join(", ")}, hasMedia: ${!!mediaUrl}`);

    let successfulCandidate: string | null = null;
     let apiData: any = null;
     let lastErrorMessage = "";
     let mediaFailed = false;
     let sentWithoutMedia = false;
 
     for (const candidate of phoneCandidates) {
       let result = mediaUrl && !mediaFailed
         ? await sendWhatsAppMedia({ phone: candidate, mediaType: "image", fileUrl: mediaUrl.trim(), caption: content })
         : await sendWhatsAppText(candidate, content);
 
       console.log(`WhatsApp API response status for ${candidate}:`, result.status);
       console.log(`WhatsApp API response for ${candidate}:`, result.raw);
 
       if (result.ok) {
         successfulCandidate = candidate;
         apiData = result.data;
          sentWithoutMedia = mediaFailed;
         break;
       }
 
       lastErrorMessage = `WhatsApp API error: ${result.status} - ${result.raw}`;
       apiData = result.data;
 
       const responseText = result.raw.toLowerCase();
       const notFoundOnWhatsApp =
         responseText.includes("not on whatsapp") ||
         responseText.includes("não está no whatsapp") ||
         responseText.includes("not found");
 
        const mediaRejected =
          mediaUrl && !mediaFailed && (
            responseText.includes("owned media") ||
            responseText.includes("must be a url") ||
            responseText.includes("invalid media") ||
            responseText.includes("media") && result.status === 400
          );

        if (mediaRejected) {
          console.log(`Media rejected for ${candidate}, retrying as text-only`);
          mediaFailed = true;
          const textResult = await sendWhatsAppText(candidate, mediaUrl ? `${content}\n\n${mediaUrl}` : content);
          console.log(`Text fallback status for ${candidate}:`, textResult.status);
          if (textResult.ok) {
            successfulCandidate = candidate;
            apiData = textResult.data;
            sentWithoutMedia = true;
            break;
          }
          lastErrorMessage = `WhatsApp API error (fallback): ${textResult.status} - ${textResult.raw}`;
          apiData = textResult.data;
          continue;
        }

       if (!notFoundOnWhatsApp) {
         break;
       }
     }

    if (!successfulCandidate) {
      return new Response(
        JSON.stringify({
          success: false,
          error: mediaFailed
            ? "A imagem foi rejeitada pelo WhatsApp (URL inválida ou inacessível). Tente outra imagem ou envie sem mídia."
            : lastErrorMessage.toLowerCase().includes("not on whatsapp") || lastErrorMessage.toLowerCase().includes("not found")
              ? "Não consegui localizar esse número no WhatsApp. Confira o DDD, o 9º dígito e se o telefone do carrinho não é um dado de teste."
              : `Falha ao enviar via WhatsApp: ${lastErrorMessage.substring(0, 300)}`,
          details: lastErrorMessage,
          triedNumbers: phoneCandidates,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const phoneVariants = Array.from(
      new Set([successfulCandidate, successfulCandidate.replace(/^55/, ""), `+${successfulCandidate}`]),
    );

    let contact: Record<string, unknown> | null = null;

    for (const variant of phoneVariants) {
      const { data } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", authenticatedUserId)
        .eq("phone", variant)
        .maybeSingle();

      if (data) {
        contact = data;
        break;
      }
    }

    if (!contact) {
      const { data: newContact, error: contactErr } = await supabase
        .from("contacts")
        .insert({
          name: successfulCandidate,
          phone: `+${successfulCandidate}`,
          user_id: authenticatedUserId,
        })
        .select()
        .single();

      if (contactErr) {
        console.error("Error creating contact:", contactErr);
      } else {
        contact = newContact;
      }
    }

    if (contact) {
      let conversation: Record<string, unknown> | null = null;

      const { data: existingConv } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", authenticatedUserId)
        .eq("contact_id", String(contact.id))
        .eq("channel", "whatsapp")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        conversation = existingConv;
      } else {
        const { data: newConv, error: convErr } = await supabase
          .from("conversations")
          .insert({
            contact_id: String(contact.id),
            channel: "whatsapp",
            status: "novo",
            last_message: content,
            last_message_at: new Date().toISOString(),
            user_id: authenticatedUserId,
          })
          .select()
          .single();

        if (convErr) {
          console.error("Error creating conversation:", convErr);
        } else {
          conversation = newConv;
        }
      }

      if (conversation) {
        const messageType = mediaUrl ? "image" : "text";

        // Extract Evolution message ID
        const metadata: any = {
          api_response: apiData,
          source: "individual_send"
        };
        const evolutionId = apiData?.key?.id || apiData?.id || apiData?.item?.key?.id;
        if (evolutionId) {
          metadata.evolution_message_id = evolutionId;
        }

        const { error: msgErr } = await supabase.from("messages").insert({
          conversation_id: String(conversation.id),
          content,
          sender_type: "agent",
          message_type: messageType,
          media_url: mediaUrl || null,
          status: "sent",
          user_id: authenticatedUserId,
          metadata: metadata,
        });

        if (msgErr) {
          console.error("Error saving message:", msgErr);
        }

        await supabase
          .from("conversations")
          .update({
            last_message: content,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", String(conversation.id))
          .eq("user_id", authenticatedUserId);
      }
    }

     return new Response(JSON.stringify({ success: true, data: apiData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending individual message:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});