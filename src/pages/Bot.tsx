import { useState, useEffect } from "react";
import { Bot as BotIcon, Save, Loader2, Plus, Trash2, GripVertical, MessageSquare } from "lucide-react";
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

interface MenuItem {
  id: string;
  label: string;
  response: string;
}

interface MenuConfig {
  welcome_message: string;
  fallback_message: string;
  menu_items: MenuItem[];
}

const generateId = () => crypto.randomUUID();

const defaultConfig: MenuConfig = {
  welcome_message: "Olá! Como posso ajudar? Escolha uma opção digitando o número:",
  fallback_message: "Desculpe, não entendi. Por favor, escolha uma das opções digitando o número correspondente.",
  menu_items: [
    { id: generateId(), label: "Suporte", response: "Para suporte, descreva seu problema que vamos te ajudar!" },
    { id: generateId(), label: "Trocas e Devoluções", response: "Para trocas ou devoluções, envie o número do seu pedido e o motivo." },
  ],
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
        if (val?.menu_items) {
          setConfig({
            welcome_message: val.welcome_message || defaultConfig.welcome_message,
            fallback_message: val.fallback_message || defaultConfig.fallback_message,
            menu_items: val.menu_items || defaultConfig.menu_items,
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
    if (config.menu_items.length === 0) {
      toast.error("Adicione pelo menos uma opção ao menu.");
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("bot_settings")
        .update({
          is_active: botActive,
          value: config as any,
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

  const addItem = () => {
    setConfig(prev => ({
      ...prev,
      menu_items: [...prev.menu_items, { id: generateId(), label: "", response: "" }],
    }));
  };

  const removeItem = (id: string) => {
    setConfig(prev => ({
      ...prev,
      menu_items: prev.menu_items.filter(item => item.id !== id),
    }));
  };

  const updateItem = (id: string, field: keyof MenuItem, value: string) => {
    setConfig(prev => ({
      ...prev,
      menu_items: prev.menu_items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  // Build preview text
  const previewText = () => {
    let text = config.welcome_message + "\n\n";
    config.menu_items.forEach((item, i) => {
      text += `${i + 1} - ${item.label}\n`;
    });
    return text;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bot de Menu</h1>
          <p className="text-muted-foreground">Crie um menu interativo de perguntas e respostas para o WhatsApp</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={botActive ? "default" : "secondary"} className={botActive ? "bg-green-600" : ""}>
            {botActive ? "Ativo" : "Inativo"}
          </Badge>
          <Switch checked={botActive} onCheckedChange={handleToggleBot} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BotIcon className="w-5 h-5 text-primary" />
                <CardTitle>Mensagens</CardTitle>
              </div>
              <CardDescription>Configure a mensagem de boas-vindas e a de erro</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Mensagem de boas-vindas</Label>
                <Textarea
                  value={config.welcome_message}
                  onChange={e => setConfig(prev => ({ ...prev, welcome_message: e.target.value }))}
                  placeholder="Olá! Como posso ajudar?"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Mensagem de opção inválida</Label>
                <Input
                  value={config.fallback_message}
                  onChange={e => setConfig(prev => ({ ...prev, fallback_message: e.target.value }))}
                  placeholder="Não entendi, escolha uma opção..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Opções do Menu</CardTitle>
                  <CardDescription>Adicione as opções que o cliente pode escolher</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.menu_items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma opção adicionada. Clique em "Adicionar" para começar.
                </p>
              )}
              {config.menu_items.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Nome da opção</Label>
                    <Input
                      value={item.label}
                      onChange={e => updateItem(item.id, "label", e.target.value)}
                      placeholder="Ex: Suporte, Trocas, Dúvidas..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Resposta automática</Label>
                    <Textarea
                      value={item.response}
                      onChange={e => updateItem(item.id, "response", e.target.value)}
                      placeholder="Mensagem que será enviada quando o cliente escolher esta opção..."
                      rows={2}
                    />
                  </div>
                </div>
              ))}
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
              <CardDescription>Assim ficará a conversa no WhatsApp</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-[#0b141a] rounded-xl p-4 space-y-3 min-h-[300px]">
                {/* Bot welcome */}
                <div className="flex justify-start">
                  <div className="bg-[#202c33] text-[#e9edef] rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] text-sm whitespace-pre-line">
                    {previewText()}
                  </div>
                </div>

                {/* User reply simulation */}
                {config.menu_items.length > 0 && (
                  <>
                    <div className="flex justify-end">
                      <div className="bg-[#005c4b] text-[#e9edef] rounded-lg rounded-tr-none px-3 py-2 max-w-[85%] text-sm">
                        1
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-[#202c33] text-[#e9edef] rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] text-sm whitespace-pre-line">
                        {config.menu_items[0]?.response || "..."}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
