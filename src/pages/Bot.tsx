import { useState, useEffect } from "react";
import { Bot as BotIcon, Save, Loader2, MessageSquare, Variable } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MenuConfig {
  welcome_message: string;
  fallback_message: string;
  menu_items: any[];
}

const RE_NOME = /\{nome\}/g;
const RE_SAUDACAO = /\{saudacao\}/g;
const VAR_NOME = "{nome}";
const VAR_SAUDACAO = "{saudacao}";

const defaultConfig: MenuConfig = {
  welcome_message: VAR_SAUDACAO + ", " + VAR_NOME + "! Seja bem-vindo(a) à LOUDER.ink! 🖤",
  fallback_message: "",
  menu_items: [],
};

export default function Bot() {
  const [botActive, setBotActive] = useState(false);
  const [config, setConfig] = useState<MenuConfig>(defaultConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBotSettings();
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
        const val = data.value as any;
        if (val) {
          setConfig({
            welcome_message: val.welcome_message || defaultConfig.welcome_message,
            fallback_message: val.fallback_message || "",
            menu_items: [],
          });
        }
      }
    } catch (error) {
      console.error("Error fetching bot settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBot = async (active: boolean) => {
    setBotActive(active);
    try {
      await supabase
        .from("bot_settings")
        .update({ is_active: active, updated_at: new Date().toISOString() })
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
          value: { welcome_message: config.welcome_message, fallback_message: "", menu_items: [] } as any,
          updated_at: new Date().toISOString(),
        })
        .eq("key", "chatbot_nuvemshop");

      if (error) {
        toast.error("Erro ao salvar configurações");
      } else {
        toast.success("Configurações salvas!");
      }
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  const previewText = () => {
    const now = new Date();
    const hour = now.getHours();
    const saudacao = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
    return config.welcome_message
      .replace(RE_NOME, "João")
      .replace(RE_SAUDACAO, saudacao);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bot de Boas-vindas</h1>
            <p className="text-muted-foreground">Envie uma mensagem automática de boas-vindas para clientes Nuvemshop</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={botActive ? "default" : "secondary"} className={botActive ? "bg-green-600" : ""}>
              {botActive ? "Ativo" : "Inativo"}
            </Badge>
            <Switch checked={botActive} onCheckedChange={handleToggleBot} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Config */}
          <div className="space-y-6 pb-6">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Variable className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Variáveis disponíveis</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="font-mono text-xs cursor-pointer hover:bg-primary/10" onClick={() => navigator.clipboard.writeText(VAR_NOME).then(() => toast.success("Copiado!"))}>
                    &#123;nome&#125;
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs cursor-pointer hover:bg-primary/10" onClick={() => navigator.clipboard.writeText(VAR_SAUDACAO).then(() => toast.success("Copiado!"))}>
                    &#123;saudacao&#125;
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Clique para copiar. <strong>&#123;nome&#125;</strong> = nome do contato, <strong>&#123;saudacao&#125;</strong> = Bom dia/Boa tarde/Boa noite (automático).
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BotIcon className="w-5 h-5 text-primary" />
                  <CardTitle>Mensagem de Boas-vindas</CardTitle>
                </div>
                <CardDescription>Configure a mensagem que será enviada automaticamente quando um cliente Nuvemshop entrar em contato</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    value={config.welcome_message}
                    onChange={e => setConfig(prev => ({ ...prev, welcome_message: e.target.value }))}
                    placeholder="Olá! Seja bem-vindo(a)!"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Configurações
            </Button>
          </div>

          {/* Preview */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <CardTitle>Pré-visualização</CardTitle>
                </div>
                <CardDescription>Assim ficará a mensagem no WhatsApp</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-[#0b141a] rounded-xl p-4 space-y-3 min-h-[200px]">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="bg-[#005c4b] text-[#e9edef] rounded-lg rounded-tr-none px-3 py-2 max-w-[85%] text-sm">
                      Oi, quero saber sobre meu pedido
                    </div>
                  </div>
                  {/* Bot welcome */}
                  <div className="flex justify-start">
                    <div className="bg-[#202c33] text-[#e9edef] rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] text-sm whitespace-pre-line">
                      {previewText()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
