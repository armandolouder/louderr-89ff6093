import { useState, useEffect } from "react";
import { Bot as BotIcon, MessageSquare, Save, Loader2, BarChart3, Clock, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BotConfig {
  system_prompt: string;
  model: string;
  max_tokens: number;
}

export default function Bot() {
  const [botActive, setBotActive] = useState(false);
  const [botConfig, setBotConfig] = useState<BotConfig>({
    system_prompt: "Você é um assistente de atendimento ao cliente da loja. Seja educado, prestativo e responda de forma concisa. Responda em português brasileiro.",
    model: "llama-3.3-70b-versatile",
    max_tokens: 512,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ totalReplies: 0, todayReplies: 0, customersReached: 0 });

  useEffect(() => {
    fetchBotSettings();
    fetchStats();
  }, []);

  const fetchBotSettings = async () => {
    try {
      const { data } = await supabase
        .from("bot_settings")
        .select("*")
        .eq("key", "chatbot_nuvemshop")
        .single();

      if (data) {
        setBotActive(data.is_active || false);
        const val = data.value as any as BotConfig;
        if (val) {
          setBotConfig({
            system_prompt: val.system_prompt || botConfig.system_prompt,
            model: val.model || botConfig.model,
            max_tokens: val.max_tokens || botConfig.max_tokens,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching bot settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: totalCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("sender_type", "bot");

      const { count: todayCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("sender_type", "bot")
        .gte("created_at", today.toISOString());

      setStats({
        totalReplies: totalCount || 0,
        todayReplies: todayCount || 0,
        customersReached: 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleToggleBot = async (active: boolean) => {
    setBotActive(active);
    try {
      await supabase
        .from("bot_settings")
        .update({
          is_active: active,
          updated_at: new Date().toISOString(),
        })
        .eq("key", "chatbot_nuvemshop");

      toast.success(active ? "Bot ativado!" : "Bot desativado!");
    } catch (error) {
      console.error("Error toggling bot:", error);
      setBotActive(!active);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("bot_settings")
        .update({
          is_active: botActive,
          value: botConfig as any,
          updated_at: new Date().toISOString(),
        })
        .eq("key", "chatbot_nuvemshop");

      if (error) {
        toast.error("Erro ao salvar configurações do bot");
      } else {
        toast.success("Configurações salvas!");
      }
    } catch (error) {
      toast.error("Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bot de Respostas</h1>
          <p className="text-muted-foreground">Responde automaticamente clientes da Nuvemshop via WhatsApp</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={botActive ? "default" : "secondary"} className={botActive ? "bg-green-600" : ""}>
            {botActive ? "Ativo" : "Inativo"}
          </Badge>
          <Switch checked={botActive} onCheckedChange={handleToggleBot} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalReplies}</p>
              <p className="text-xs text-muted-foreground">Respostas totais</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.todayReplies}</p>
              <p className="text-xs text-muted-foreground">Respostas hoje</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">Nuvemshop</p>
              <p className="text-xs text-muted-foreground">Apenas clientes da loja</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BotIcon className="w-5 h-5 text-primary" />
            <CardTitle>Configurações do Bot</CardTitle>
          </div>
          <CardDescription>
            Personalize o comportamento e a personalidade do bot de atendimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-2 text-sm">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {botActive ? (
                <span className="text-green-500 font-medium">Ativo — respondendo clientes Nuvemshop automaticamente</span>
              ) : (
                "Desativado — nenhuma resposta automática será enviada"
              )}
            </span>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="system-prompt">Prompt do Sistema (personalidade do bot)</Label>
            <Textarea
              id="system-prompt"
              value={botConfig.system_prompt}
              onChange={(e) => setBotConfig({ ...botConfig, system_prompt: e.target.value })}
              placeholder="Defina a personalidade e instruções do bot..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Descreva como o bot deve se comportar, qual tom usar e quaisquer instruções específicas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">Modelo IA</Label>
              <Input
                id="model"
                value={botConfig.model}
                onChange={(e) => setBotConfig({ ...botConfig, model: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Modelo usado via Groq API</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-tokens">Max Tokens</Label>
              <Input
                id="max-tokens"
                type="number"
                value={botConfig.max_tokens}
                onChange={(e) => setBotConfig({ ...botConfig, max_tokens: parseInt(e.target.value) || 512 })}
              />
              <p className="text-xs text-muted-foreground">Limite de tokens por resposta</p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
