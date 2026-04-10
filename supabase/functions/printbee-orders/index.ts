import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PRINTBEE_API = "https://api.printbee.com.br/api";

async function getToken(): Promise<string> {
  const clientId = Deno.env.get("PRINTBEE_CLIENT_ID");
  const clientSecret = Deno.env.get("PRINTBEE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("PRINTBEE_CLIENT_ID ou PRINTBEE_CLIENT_SECRET não configurados");
  }

  const res = await fetch(`${PRINTBEE_API}/Auth/Token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Falha na autenticação PrintBee [${res.status}]: ${txt}`);
  }

  const data = await res.json();
  // The token might be in data.token, data.access_token, or the response itself
  return data.token || data.access_token || data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify user auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read action from body (POST) or query params
    let action = "orders";
    let page = "1";
    let pageSize = "50";
    
    if (req.method === "POST") {
      try {
        const body = await req.json();
        action = body.action || "orders";
        page = body.page || "1";
        pageSize = body.pageSize || "50";
      } catch {
        // fallback to defaults
      }
    } else {
      const url = new URL(req.url);
      action = url.searchParams.get("action") || "orders";
      page = url.searchParams.get("page") || "1";
      pageSize = url.searchParams.get("pageSize") || "50";
    }

    if (action === "test-connection") {
      try {
        const token = await getToken();
        return new Response(
          JSON.stringify({ connected: true, supplier: "PrintBee" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e: any) {
        return new Response(
          JSON.stringify({ connected: false, error: e.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (action === "orders") {
      const token = await getToken();
      
      const ordersRes = await fetch(
        `${PRINTBEE_API}/Orders?page=${page}&pageSize=${pageSize}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!ordersRes.ok) {
        const txt = await ordersRes.text();
        throw new Error(`Erro ao buscar pedidos PrintBee [${ordersRes.status}]: ${txt}`);
      }

      const ordersData = await ordersRes.json();
      return new Response(JSON.stringify(ordersData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("PrintBee error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
