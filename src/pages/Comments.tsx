import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Instagram, MessageCircle, EyeOff, Reply, ExternalLink, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Comment = {
  id: string;
  comment_id: string;
  media_id: string | null;
  media_url: string | null;
  media_caption: string | null;
  parent_comment_id: string | null;
  author_id: string | null;
  author_username: string | null;
  text: string | null;
  status: string;
  reply_text: string | null;
  replied_at: string | null;
  hidden: boolean | null;
  sentiment: string | null;
  received_at: string;
  created_at: string;
};

type Filter = "all" | "new" | "replied" | "hidden";

export default function Comments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("meta_comments")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error("Erro ao carregar comentários");
    } else {
      setComments((data || []) as unknown as Comment[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("ig-comments")
      .on("postgres_changes", { event: "*", schema: "public", table: "meta_comments" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = comments.filter((c) => {
    if (filter === "new" && c.status !== "new") return false;
    if (filter === "replied" && c.status !== "replied") return false;
    if (filter === "hidden" && !c.hidden) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.text?.toLowerCase().includes(q) ||
        c.author_username?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: comments.length,
    new: comments.filter((c) => c.status === "new").length,
    replied: comments.filter((c) => c.status === "replied").length,
    hidden: comments.filter((c) => c.hidden).length,
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    // TODO: chamar edge function meta-reply-comment quando Meta estiver configurada
    const { error } = await supabase
      .from("meta_comments")
      .update({
        reply_text: replyText,
        replied_at: new Date().toISOString(),
        status: "replied",
      })
      .eq("id", selected.id);
    setSending(false);
    if (error) {
      toast.error("Erro ao salvar resposta");
    } else {
      toast.success("Resposta registrada (envio à Meta será ativado após configuração)");
      setReplyText("");
      load();
    }
  };

  const handleHide = async (c: Comment) => {
    const { error } = await supabase
      .from("meta_comments")
      .update({ hidden: !c.hidden })
      .eq("id", c.id);
    if (error) toast.error("Erro ao ocultar");
    else load();
  };

  return (
    <div className="flex h-full bg-background">
      {/* Lista */}
      <div className="w-[420px] border-r border-border flex flex-col">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">Comentários</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar comentários..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-none"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList className="grid grid-cols-4 w-full rounded-none">
              <TabsTrigger value="all" className="rounded-none text-xs">
                Todos {counts.all > 0 && <span className="ml-1 opacity-70">({counts.all})</span>}
              </TabsTrigger>
              <TabsTrigger value="new" className="rounded-none text-xs">
                Novos {counts.new > 0 && <span className="ml-1 opacity-70">({counts.new})</span>}
              </TabsTrigger>
              <TabsTrigger value="replied" className="rounded-none text-xs">
                Respondidos
              </TabsTrigger>
              <TabsTrigger value="hidden" className="rounded-none text-xs">
                Ocultos
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Instagram className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Nenhum comentário encontrado.
              <p className="mt-2 text-xs">
                Os comentários aparecerão aqui assim que a integração com a Meta estiver ativa.
              </p>
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelected(c);
                  setReplyText(c.reply_text || "");
                }}
                className={cn(
                  "w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors",
                  selected?.id === c.id && "bg-muted"
                )}
              >
                <div className="flex items-start gap-2 mb-1">
                  <Instagram className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">
                        @{c.author_username || "anônimo"}
                      </span>
                      {c.status === "new" && (
                        <Badge variant="default" className="text-[10px] h-4 rounded-none">novo</Badge>
                      )}
                      {c.status === "replied" && (
                        <Badge variant="secondary" className="text-[10px] h-4 rounded-none">respondido</Badge>
                      )}
                      {c.hidden && (
                        <Badge variant="outline" className="text-[10px] h-4 rounded-none">oculto</Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground/80 line-clamp-2 mt-0.5">{c.text}</p>
                    <span className="text-[11px] text-muted-foreground">
                      {c.received_at
                        ? formatDistanceToNow(new Date(c.received_at), { addSuffix: true, locale: ptBR })
                        : ""}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detalhe */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Instagram className="w-5 h-5 text-pink-500" />
                <span className="font-medium">@{selected.author_username || "anônimo"}</span>
              </div>
              <div className="flex gap-2">
                {selected.media_url && (
                  <Button variant="outline" size="sm" asChild className="rounded-none">
                    <a href={selected.media_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1" /> Ver post
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-none"
                  onClick={() => handleHide(selected)}
                >
                  <EyeOff className="w-4 h-4 mr-1" />
                  {selected.hidden ? "Reexibir" : "Ocultar"}
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <Card className="p-4 rounded-none border-border">
                <div className="text-xs text-muted-foreground mb-2">Comentário original</div>
                <p className="text-sm whitespace-pre-wrap">{selected.text}</p>
                <div className="text-[11px] text-muted-foreground mt-3">
                  {selected.received_at &&
                    formatDistanceToNow(new Date(selected.received_at), { addSuffix: true, locale: ptBR })}
                </div>
              </Card>
              {selected.reply_text && (
                <Card className="p-4 rounded-none border-border bg-muted/30 ml-8">
                  <div className="text-xs text-muted-foreground mb-2">Sua resposta</div>
                  <p className="text-sm whitespace-pre-wrap">{selected.reply_text}</p>
                </Card>
              )}
            </div>
            <div className="p-4 border-t border-border space-y-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Escreva uma resposta..."
                rows={3}
                className="rounded-none resize-none"
              />
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-muted-foreground">
                  O envio à Meta será ativado após a configuração da integração.
                </span>
                <Button
                  onClick={handleReply}
                  disabled={!replyText.trim() || sending}
                  className="rounded-none"
                >
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Reply className="w-4 h-4 mr-2" />}
                  Responder
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecione um comentário para responder</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}