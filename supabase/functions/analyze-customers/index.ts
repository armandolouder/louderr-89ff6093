import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  phone_status: string;
  email: string | null;
  email_status: string;
  city: string | null;
  state: string | null;
  region: string | null;
  total_spent: number;
  order_count: number;
  first_purchase_at: string | null;
  last_purchase_at: string | null;
}

interface ClusterDefinition {
  name: string;
  emoji: string;
  description: string;
  objective: string;
  recommendation: string;
  color: string;
  criteria: {
    rfm_scores?: string[];
    ticket_level?: string[];
    regions?: string[];
    recency_days?: { min?: number; max?: number };
  };
}

// Pre-defined clusters based on the PRD
const CLUSTER_DEFINITIONS: ClusterDefinition[] = [
  {
    name: "VIP Ativo",
    emoji: "⭐",
    description: "Clientes de alto valor com compras recentes e frequentes",
    objective: "Retenção e aumento de ticket",
    recommendation: "Preview exclusivo, programa VIP, atendimento prioritário",
    color: "#FFD700",
    criteria: { rfm_scores: ["555", "554", "545", "544"], ticket_level: ["high"] },
  },
  {
    name: "VIP em Risco",
    emoji: "🚨",
    description: "Clientes VIP que não compram há algum tempo",
    objective: "Reativação urgente",
    recommendation: "Oferta especial 25-30% OFF, contato personalizado",
    color: "#FF4444",
    criteria: { rfm_scores: ["255", "245", "155"], ticket_level: ["high"] },
  },
  {
    name: "Cliente Fiel",
    emoji: "💚",
    description: "Compram regularmente com ticket médio",
    objective: "Manter engajamento",
    recommendation: "Programa de pontos, benefícios exclusivos",
    color: "#22C55E",
    criteria: { rfm_scores: ["444", "443", "434", "433", "344"], ticket_level: ["medium"] },
  },
  {
    name: "Premium Novo",
    emoji: "🌟",
    description: "Clientes novos com primeira compra de alto valor",
    objective: "Converter em cliente frequente",
    recommendation: "Welcome series, recomendações personalizadas",
    color: "#8B5CF6",
    criteria: { rfm_scores: ["511", "512", "521"], ticket_level: ["high"] },
  },
  {
    name: "Premium Dormindo",
    emoji: "💤",
    description: "Fizeram compras premium mas pararam",
    objective: "Reativação",
    recommendation: "Novidades, ofertas de retorno",
    color: "#6366F1",
    criteria: { rfm_scores: ["211", "212", "221", "222"], ticket_level: ["high", "medium"] },
  },
  {
    name: "Crescente",
    emoji: "📈",
    description: "Clientes com frequência crescente de compras",
    objective: "Acelerar crescimento",
    recommendation: "Cross-sell, upsell, benefícios progressivos",
    color: "#14B8A6",
    criteria: { rfm_scores: ["333", "334", "343", "423", "424"], ticket_level: ["medium"] },
  },
  {
    name: "Ocasional",
    emoji: "🎯",
    description: "Compram esporadicamente em promoções",
    objective: "Aumentar frequência",
    recommendation: "Ofertas recorrentes, lembretes personalizados",
    color: "#F59E0B",
    criteria: { rfm_scores: ["312", "313", "322", "323"], ticket_level: ["low", "medium"] },
  },
  {
    name: "Infrequente",
    emoji: "❌",
    description: "Baixa frequência e recência, risco de churn",
    objective: "Reativação ou descarte",
    recommendation: "Última tentativa com oferta agressiva",
    color: "#EF4444",
    criteria: { rfm_scores: ["111", "112", "121", "122", "211"], ticket_level: ["low"] },
  },
  {
    name: "Novo/Experimental",
    emoji: "🆕",
    description: "Primeira compra recente, explorando",
    objective: "Segunda compra",
    recommendation: "Onboarding, primeira oferta de retorno",
    color: "#3B82F6",
    criteria: { rfm_scores: ["411", "412", "511"], ticket_level: ["low", "medium"] },
  },
  {
    name: "Regional Sul",
    emoji: "🌍",
    description: "Clientes concentrados na região Sul",
    objective: "Marketing regional",
    recommendation: "Campanhas com identidade regional",
    color: "#10B981",
    criteria: { regions: ["Sul"] },
  },
  {
    name: "Regional Nordeste",
    emoji: "🌏",
    description: "Clientes concentrados na região Nordeste",
    objective: "Marketing regional",
    recommendation: "Campanhas com identidade regional",
    color: "#F97316",
    criteria: { regions: ["Nordeste"] },
  },
  {
    name: "Pesquisador",
    emoji: "🔍",
    description: "Visitou várias vezes mas comprou pouco",
    objective: "Conversão",
    recommendation: "Conteúdo educativo, provas sociais, ofertas",
    color: "#8B5CF6",
    criteria: { rfm_scores: ["311", "211", "111"], ticket_level: ["low"] },
  },
];

function calculateRFMScores(customers: Customer[]): Map<string, { r: number; f: number; m: number; score: string }> {
  const now = new Date();
  const rfmMap = new Map<string, { r: number; f: number; m: number; score: string }>();

  // Calculate recency in days for each customer
  const recencyValues: { id: string; days: number }[] = [];
  const frequencyValues: { id: string; count: number }[] = [];
  const monetaryValues: { id: string; value: number }[] = [];

  customers.forEach((customer) => {
    const lastPurchase = customer.last_purchase_at ? new Date(customer.last_purchase_at) : null;
    const recencyDays = lastPurchase
      ? Math.floor((now.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24))
      : 365;

    recencyValues.push({ id: customer.id, days: recencyDays });
    frequencyValues.push({ id: customer.id, count: customer.order_count || 0 });
    monetaryValues.push({ id: customer.id, value: customer.total_spent || 0 });
  });

  // Sort and assign quintiles (1-5)
  const assignQuintile = (values: { id: string; value: number }[], ascending = true) => {
    const sorted = [...values].sort((a, b) => ascending ? a.value - b.value : b.value - a.value);
    const quintileSize = Math.ceil(sorted.length / 5);
    const result = new Map<string, number>();
    
    sorted.forEach((item, index) => {
      const quintile = Math.min(5, Math.floor(index / quintileSize) + 1);
      result.set(item.id, quintile);
    });
    
    return result;
  };

  // Recency: lower days = higher score (5), so ascending=false for the score
  const recencyScores = assignQuintile(
    recencyValues.map((r) => ({ id: r.id, value: r.days })),
    false // Lower days = higher quintile (5)
  );

  // Frequency: higher count = higher score (5)
  const frequencyScores = assignQuintile(
    frequencyValues.map((f) => ({ id: f.id, value: f.count })),
    true
  );

  // Monetary: higher value = higher score (5)
  const monetaryScores = assignQuintile(
    monetaryValues.map((m) => ({ id: m.id, value: m.value })),
    true
  );

  customers.forEach((customer) => {
    const r = recencyScores.get(customer.id) || 1;
    const f = frequencyScores.get(customer.id) || 1;
    const m = monetaryScores.get(customer.id) || 1;
    
    rfmMap.set(customer.id, {
      r,
      f,
      m,
      score: `${r}${f}${m}`,
    });
  });

  return rfmMap;
}

function getTicketLevel(totalSpent: number, avgTicket: number): string {
  if (totalSpent >= avgTicket * 2) return "high";
  if (totalSpent >= avgTicket * 0.5) return "medium";
  return "low";
}

function assignCustomerToCluster(
  customer: Customer,
  rfm: { r: number; f: number; m: number; score: string },
  ticketLevel: string,
  clusters: ClusterDefinition[]
): ClusterDefinition | null {
  // Try to match by RFM score first
  for (const cluster of clusters) {
    const criteria = cluster.criteria;

    // Check RFM score match
    if (criteria.rfm_scores?.includes(rfm.score)) {
      // Also check ticket level if specified
      if (!criteria.ticket_level || criteria.ticket_level.includes(ticketLevel)) {
        return cluster;
      }
    }

    // Check region match
    if (criteria.regions && customer.region && criteria.regions.includes(customer.region)) {
      return cluster;
    }
  }

  // Default: assign based on RFM pattern
  if (rfm.r >= 4 && rfm.f >= 4 && rfm.m >= 4) {
    return clusters.find((c) => c.name === "VIP Ativo") || null;
  }
  if (rfm.r <= 2 && rfm.m >= 4) {
    return clusters.find((c) => c.name === "VIP em Risco") || null;
  }
  if (rfm.r >= 4 && rfm.f === 1) {
    return clusters.find((c) => c.name === "Novo/Experimental") || null;
  }
  if (rfm.r <= 2 && rfm.f <= 2 && rfm.m <= 2) {
    return clusters.find((c) => c.name === "Infrequente") || null;
  }

  // Fallback to "Ocasional"
  return clusters.find((c) => c.name === "Ocasional") || clusters[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch ALL imported customers (bypassing default 1000 limit)
    let allCustomers: Customer[] = [];
    let offset = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: batch, error: fetchError } = await supabase
        .from("imported_customers")
        .select("*")
        .range(offset, offset + pageSize - 1)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      if (!batch || batch.length === 0) break;
      
      allCustomers = allCustomers.concat(batch);
      offset += pageSize;
      
      if (batch.length < pageSize) break;
    }

    if (allCustomers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Nenhum cliente importado encontrado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing ${allCustomers.length} customers...`);

    // Calculate RFM scores
    const rfmScores = calculateRFMScores(allCustomers);

    // Calculate average ticket for ticket level classification
    const totalSpentSum = allCustomers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    const avgTicket = totalSpentSum / allCustomers.length || 100;

    // Clear existing clusters
    await supabase.from("customer_clusters").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Create clusters in database
    const clusterInserts = CLUSTER_DEFINITIONS.map((cluster) => ({
      name: cluster.name,
      emoji: cluster.emoji,
      description: cluster.description,
      objective: cluster.objective,
      recommendation: cluster.recommendation,
      color: cluster.color,
      criteria: cluster.criteria,
      customer_count: 0,
      percentage: 0,
    }));

    const { data: insertedClusters, error: clusterError } = await supabase
      .from("customer_clusters")
      .insert(clusterInserts)
      .select();

    if (clusterError) throw clusterError;

    // Map cluster names to IDs
    const clusterNameToId = new Map<string, string>();
    insertedClusters?.forEach((cluster) => {
      clusterNameToId.set(cluster.name, cluster.id);
    });

    // Assign customers to clusters
    const clusterCounts = new Map<string, number>();
    const customerUpdates: { id: string; cluster_id: string; rfm_recency: number; rfm_frequency: number; rfm_monetary: number; rfm_score: string; ticket_level: string }[] = [];

    allCustomers.forEach((customer) => {
      const rfm = rfmScores.get(customer.id);
      if (!rfm) return;

      const ticketLevel = getTicketLevel(customer.total_spent || 0, avgTicket);
      const cluster = assignCustomerToCluster(customer, rfm, ticketLevel, CLUSTER_DEFINITIONS);

      if (cluster) {
        const clusterId = clusterNameToId.get(cluster.name);
        if (clusterId) {
          customerUpdates.push({
            id: customer.id,
            cluster_id: clusterId,
            rfm_recency: rfm.r,
            rfm_frequency: rfm.f,
            rfm_monetary: rfm.m,
            rfm_score: rfm.score,
            ticket_level: ticketLevel,
          });

          clusterCounts.set(cluster.name, (clusterCounts.get(cluster.name) || 0) + 1);
        }
      }
    });

    console.log(`Assigning ${customerUpdates.length} customers to clusters...`);

    // Update customers in parallel batches (much faster)
    const batchSize = 100;
    const batches: Promise<void>[] = [];
    
    for (let i = 0; i < customerUpdates.length; i += batchSize) {
      const batch = customerUpdates.slice(i, i + batchSize);
      
      // Process each batch in parallel
      const batchPromise = Promise.all(
        batch.map((update) =>
          supabase
            .from("imported_customers")
            .update({
              cluster_id: update.cluster_id,
              rfm_recency: update.rfm_recency,
              rfm_frequency: update.rfm_frequency,
              rfm_monetary: update.rfm_monetary,
              rfm_score: update.rfm_score,
              ticket_level: update.ticket_level,
            })
            .eq("id", update.id)
        )
      ).then(() => {});
      
      batches.push(batchPromise);
      
      // Process 5 batches at a time to avoid overwhelming the DB
      if (batches.length >= 5) {
        await Promise.all(batches);
        batches.length = 0;
      }
    }
    
    // Process remaining batches
    if (batches.length > 0) {
      await Promise.all(batches);
    }

    console.log(`Updating cluster counts...`);

    // Update cluster counts in parallel
    const countUpdates = Array.from(clusterCounts.entries()).map(([clusterName, count]) => {
      const clusterId = clusterNameToId.get(clusterName);
      if (clusterId) {
        const percentage = (count / allCustomers.length) * 100;
        return supabase
          .from("customer_clusters")
          .update({ customer_count: count, percentage: Math.round(percentage * 100) / 100 })
          .eq("id", clusterId);
      }
      return Promise.resolve();
    });

    await Promise.all(countUpdates);

    // Remove empty clusters
    await supabase
      .from("customer_clusters")
      .delete()
      .eq("customer_count", 0);

    console.log(`Analysis complete. Assigned ${customerUpdates.length} customers to clusters.`);

    return new Response(
      JSON.stringify({
        success: true,
        analyzed: allCustomers.length,
        assigned: customerUpdates.length,
        clusters: Array.from(clusterCounts.entries()).map(([name, count]) => ({
          name,
          count,
          percentage: ((count / allCustomers.length) * 100).toFixed(1),
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error analyzing customers:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
