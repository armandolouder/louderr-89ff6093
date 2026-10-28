import { z } from "zod";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const orderInputSchema = z.string().trim().regex(/^(?:BEE)?\d{1,8}$/i, "Informe um pedido como BEE00004696.");
export interface PrintbeeTracking {
  orderNSU: string | null; orderStatus: string | null; saleDate: string | null;
  deliveryDate: string | null; trackingCode: string | null; trackingUrl: string | null;
  shipmentStatus: string | null; carrierName: string | null; serviceName: string | null;
  postedAt: string | null; deliveredAt: string | null; city: string | null; state: string | null;
  recipientName?: string | null; customerName?: string | null;
  street?: string | null; number?: string | null; complement?: string | null;
  district?: string | null; zipCode?: string | null; address?: string | null;
}
export interface TrackingResult { linkId?: string; tracking: PrintbeeTracking; updatedAt: string; warning?: string }
export function printbeeStatus(value: string | null) {
  const labels: Record<string, string> = {
    OPEN: "Aberto", WAITINGPAYMENT: "Aguardando pagamento", PAYMENTRECEIVED: "Pagamento recebido",
    PRODUCTIONQUEUE: "Fila de produção", PRODUCTION: "Em produção", PRODUCTIONCOMPLETED: "Produção concluída",
    WAITINGFINALPAYMENT: "Aguardando pagamento final", DISPATCH: "Aguardando coleta",
    TRANSIT: "Em trânsito", DELIVERED: "Entregue", ATTENDED: "Atendido", LOST: "Extraviado",
    RETURNED: "Devolvido", CANCELED: "Cancelado", UNDERREVIEW: "Em revisão",
  };
  return labels[value?.replace(/[_\s-]/g, "").toUpperCase() || ""] || "Aguardando atualização";
}
export async function callPrintbee(body: { action: "generate"; order: string } | { action: "view"; linkId: string }): Promise<TrackingResult> {
  const { data, error } = await supabase.functions.invoke("printbee-tracking", { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const response = await error.context.json().catch(() => null);
      throw new Error(response?.error || "Não foi possível consultar este rastreio.");
    }
    throw new Error("Não foi possível conectar à consulta de rastreio.");
  }
  if (data?.error || !data?.tracking) throw new Error(data?.error || "Resposta de rastreio inesperada.");
  return data;
}
export function trackingDate(value: string | null, withTime = false) {
  if (!value) return "Ainda não informado";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00-03:00` : value);
  if (Number.isNaN(date.getTime())) return "Ainda não informado";
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", ...(withTime ? { timeStyle: "short" as const } : {}) });
}