import { useState, useEffect } from "react";
import { Search, Instagram, Loader2, Archive, ShoppingBag, Inbox as InboxIcon, CheckCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConversationItem } from "./ConversationItem";
import { useConversations, Conversation } from "@/hooks/useConversations";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ConversationListProps {
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
  filterTabId?: string | null;
  showArchived?: boolean;
  onToggleArchived?: () => void;
}

export function ConversationList({ selectedId, onSelect, filterTabId, showArchived = false, onToggleArchived }: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"whatsapp" | "instagram" | "customers">("customers");
  const [unreadOnly, setUnreadOnly] = useState(true);
  const [customerPhones, setCustomerPhones] = useState<Set<string> | null>(null);
  
  const { data: conversations, isLoading, error } = useConversations();
  const queryClient = useQueryClient();
  const [archivingAll, setArchivingAll] = useState(false);

  // Carrega telefones de clientes que compraram ou têm carrinho abandonado
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const norm = (p: string | null | undefined) => (p || "").replace(/\D/g, "").slice(-10);
      const [{ data: orders }, { data: carts }] = await Promise.all([
        supabase.from("nuvemshop_orders").select("customer_phone").not("customer_phone", "is", null),
        supabase.from("nuvemshop_abandoned_checkouts").select("customer_phone").not("customer_phone", "is", null),
      ]);
      if (cancelled) return;
      const set = new Set<string>();
      (orders || []).forEach((o: any) => { const k = norm(o.customer_phone); if (k) set.add(k); });
      (carts || []).forEach((c: any) => { const k = norm(c.customer_phone); if (k) set.add(k); });
      setCustomerPhones(set);
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredConversations = (conversations || []).filter((conv) => {
    const matchesArchived = showArchived ? conv.is_archived : !conv.is_archived;
    const matchesSearch = conv.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.last_message?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    let matchesChannel = true;
    // "Abertas" (ícone de caixa de entrada): mostra TODAS as conversas abertas
    // de qualquer canal, mesmo de quem ainda não é cliente. Assim um lead novo
    // do WhatsApp aparece aqui para ser respondido e fechado.
    if (unreadOnly) {
      matchesChannel = true;
    } else if (channelFilter === "customers") {
      if (!customerPhones) matchesChannel = false;
      else {
        const k = (conv.contact.phone || "").replace(/\D/g, "").slice(-10);
        matchesChannel = !!k && customerPhones.has(k);
      }
    } else matchesChannel = conv.channel === channelFilter;
    const matchesTab =
      filterTabId === null
        ? true
        : filterTabId === "__waiting__"
          ? (conv.unread_count || 0) > 0
          : (conv as any).tab_id === filterTabId;
    // "Abertas": mantém a conversa na lista mesmo após ser lida.
    // Só sai da lista quando for arquivada (fechada) pelo ícone de fechar.
    const matchesUnread = !unreadOnly || !conv.is_archived;
    return matchesArchived && matchesSearch && matchesChannel && matchesTab && matchesUnread;
  });

  const archivedCount = (conversations || []).filter(c => c.is_archived).length;

  const handleArchiveAll = async () => {
    const ids = filteredConversations.map((c) => c.id);
    if (ids.length === 0) return;
    if (!confirm(`Fechar (arquivar) ${ids.length} conversa(s)?`)) return;
    setArchivingAll(true);
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ is_archived: true })
        .in("id", ids);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(`${ids.length} conversa(s) arquivada(s)`);
    } catch {
      toast.error("Erro ao arquivar conversas");
    } finally {
      setArchivingAll(false);
    }
  };
  // Conta apenas as não lidas que passam nos mesmos filtros visíveis (canal/aba/busca)
  const unreadCount = (conversations || []).filter((conv) => {
    if (conv.is_archived) return false;
    if ((conv.unread_count || 0) === 0) return false;
    const matchesSearch = conv.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.last_message?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    let matchesChannel = true;
    if (unreadOnly) {
      matchesChannel = true;
    } else if (channelFilter === "customers") {
      if (!customerPhones) matchesChannel = false;
      else {
        const k = (conv.contact.phone || "").replace(/\D/g, "").slice(-10);
        matchesChannel = !!k && customerPhones.has(k);
      }
    } else matchesChannel = conv.channel === channelFilter;
    const matchesTab =
      filterTabId === null || filterTabId === "__waiting__"
        ? true
        : (conv as any).tab_id === filterTabId;
    return matchesSearch && matchesChannel && matchesTab;
  }).length;

  return (
    <div className="flex flex-col h-full border-r border-border bg-sidebar/50">
      <div className="p-4 md:p-5 p-3 border-b border-border space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-border h-10"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Button
            variant={unreadOnly ? "default" : "outline"}
            size="icon"
            onClick={() => setUnreadOnly(v => !v)}
            className={cn("h-8 w-8 relative flex-shrink-0", !unreadOnly && "border-border text-muted-foreground")}
            title="Aguardando — mensagens não abertas ainda"
            aria-label="Filtrar mensagens não lidas"
          >
            <InboxIcon className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 text-[10px] font-semibold bg-primary text-primary-foreground rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
          <Button
            variant={channelFilter === "customers" && !showArchived && !unreadOnly ? "default" : "outline"}
            size="sm"
            onClick={() => { setChannelFilter("customers"); setUnreadOnly(false); if (showArchived && onToggleArchived) onToggleArchived(); }}
            className={cn("h-8 px-3 gap-1.5", channelFilter !== "customers" || showArchived || unreadOnly ? "border-border text-muted-foreground" : "")}
            title="Clientes (compradores e carrinhos)"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Clientes
          </Button>
          <Button
            variant={channelFilter === "instagram" && !showArchived && !unreadOnly ? "default" : "outline"}
            size="icon"
            onClick={() => { setChannelFilter("instagram"); setUnreadOnly(false); if (showArchived && onToggleArchived) onToggleArchived(); }}
            className={cn(
              "h-8 w-8",
              channelFilter === "instagram" && !showArchived && !unreadOnly
                ? "bg-instagram text-instagram-foreground hover:bg-instagram/90"
                : "border-border text-muted-foreground"
            )}
            title="Instagram"
          >
            <Instagram className="w-4 h-4" />
          </Button>
          <Button
            variant={channelFilter === "whatsapp" && !showArchived && !unreadOnly ? "default" : "outline"}
            size="icon"
            onClick={() => { setChannelFilter("whatsapp"); setUnreadOnly(false); if (showArchived && onToggleArchived) onToggleArchived(); }}
            className={cn(
              "h-8 w-8",
              channelFilter === "whatsapp" && !showArchived && !unreadOnly
                ? "bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
                : "border-border text-muted-foreground"
            )}
            title="WhatsApp"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </Button>
          {onToggleArchived && (
            <Button
              variant={showArchived ? "default" : "outline"}
              size="icon"
              onClick={onToggleArchived}
              className={cn(
                "h-8 w-8 relative",
                !showArchived && "border-border text-muted-foreground"
              )}
              title="Arquivados"
            >
              <Archive className="w-4 h-4" />
              {archivedCount > 0 && !showArchived && (
                <span className="absolute -top-1 -right-1 text-[10px] bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
                  {archivedCount}
                </span>
              )}
            </Button>
          )}
        </div>

        {(channelFilter === "instagram" || channelFilter === "whatsapp") && !showArchived && filteredConversations.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleArchiveAll}
            disabled={archivingAll}
            className="h-8 px-3 gap-1.5 border-border text-muted-foreground w-full"
          >
            {archivingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
            Fechar todos ({filteredConversations.length})
          </Button>
        )}
      </div>
      
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-destructive">
            Erro ao carregar conversas
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Nenhuma conversa encontrada
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={selectedId === conversation.id}
              onClick={() => onSelect(conversation)}
            />
          ))
        )}
      </div>
    </div>
  );
}
