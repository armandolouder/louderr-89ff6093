import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sendEvolutionText, sendEvolutionMedia, hasEvolutionCredentials } from "../_shared/evolution-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CarouselCard {
  header: string;
  body: string;
  footer?: string;
  image?: string;
  buttons: Array<{
    type: "url" | "reply";
    title: string;
    url?: string;
    id?: string;
  }>;
}

interface SendCarouselRequest {
  number: string;
  text: string;
  carousel: CarouselCard[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!hasEvolutionCredentials()) {
      throw new Error("Evolution API credentials not configured");
    }

    const { number, text, carousel }: SendCarouselRequest = await req.json();

    if (!number || !carousel || carousel.length === 0) {
      throw new Error("number and carousel cards are required");
    }

    const formattedPhone = number.replace(/\D/g, "");

    // Evolution API has no native carousel, so we send an intro text
    // followed by each card as an image (with caption) or text message.
    const results: any[] = [];

    if (text) {
      results.push((await sendEvolutionText(formattedPhone, text)).data);
      await new Promise((r) => setTimeout(r, 1000));
    }

    for (const card of carousel) {
      let caption = card.header || "";
      if (card.body) caption += `\n${card.body}`;
      if (card.footer) caption += `\n${card.footer}`;
      // Append buttons that carry URLs as plain links
      const links = card.buttons
        .filter((b) => b.type === "url" && b.url)
        .map((b) => `${b.title}: ${b.url}`);
      if (links.length) caption += `\n\n${links.join("\n")}`;

      let res;
      if (card.image) {
        res = await sendEvolutionMedia({
          phone: formattedPhone,
          mediaType: "image",
          fileUrl: card.image,
          caption,
        });
      } else {
        res = await sendEvolutionText(formattedPhone, caption);
      }
      results.push(res.data);
      if (!res.ok) {
        throw new Error(`Evolution error [${res.status}]: ${res.raw}`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    return new Response(
      JSON.stringify({ success: true, data: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending carousel:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
