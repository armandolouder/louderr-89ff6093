import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AutomationFlow {
  id: string;
  name: string;
  status: string;
  trigger_event: string;
  delay_value: number;
  delay_unit: string;
  message_content: string;
  media_url: string | null;
  media_type: string | null;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export const TRIGGER_EVENTS = [
  { value: "order/created", label: "Pedido Realizado" },
  { value: "order/paid", label: "Pedido Pago" },
  { value: "order/packed", label: "Pedido Embalado" },
  { value: "order/fulfilled", label: "Pedido Enviado (Saiu para Entrega)" },
  { value: "order/cancelled", label: "Pedido Cancelado" },
  { value: "abandoned_checkout", label: "Carrinho Abandonado" },
  { value: "post_sale_15d", label: "Pós-venda: 15 dias após envio" },
  { value: "post_sale_30d", label: "Pós-venda: 30 dias após envio" },
  { value: "post_sale_45d", label: "Pós-venda: 45 dias após envio" },
  { value: "post_sale_60d", label: "Pós-venda: 60 dias após envio" },
];

export const AVAILABLE_VARIABLES = [
  { key: "[nome_cliente]", label: "Nome do Cliente (primeiro nome)" },
  { key: "[numero_pedido]", label: "Número do Pedido" },
  { key: "[total_pedido]", label: "Total do Pedido" },
  { key: "[link_pagamento]", label: "Link para Pagar (Geral)" },
  { key: "[link_boleto]", label: "Link do Boleto" },
  { key: "[url_sucesso_pedido]", label: "URL de Sucesso do Pedido" },
  { key: "[url_sucesso]", label: "URL de Sucesso (legado)" },
  { key: "[lista_produtos]", label: "Lista de Produtos" },
  { key: "[codigo_rastreio]", label: "Código de Rastreio" },
  { key: "[link_recuperacao]", label: "Link de Recuperação (Carrinho)" },
];

export function useAutomationFlows() {
  return useQuery({
    queryKey: ["automation-flows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_flows")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AutomationFlow[];
    },
  });
}

export function useSaveAutomationFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flow: Partial<AutomationFlow> & { id?: string }) => {
      if (flow.id) {
        const { data, error } = await supabase
          .from("automation_flows")
          .update({
            name: flow.name,
            status: flow.status,
            trigger_event: flow.trigger_event,
            delay_value: flow.delay_value,
            delay_unit: flow.delay_unit,
            message_content: flow.message_content,
            media_url: flow.media_url,
            media_type: flow.media_type,
          })
          .eq("id", flow.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("automation_flows")
          .insert({
            name: flow.name!,
            status: flow.status || "active",
            trigger_event: flow.trigger_event!,
            delay_value: flow.delay_value || 1,
            delay_unit: flow.delay_unit || "minutes",
            message_content: flow.message_content || "",
            media_url: flow.media_url,
            media_type: flow.media_type,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-flows"] });
    },
  });
}

export function useDeleteAutomationFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("automation_flows")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-flows"] });
    },
  });
}
