import { useState, useEffect } from "react";
import { Bot as BotIcon, Save, Loader2, MessageSquare, Variable, Zap, Plus, X, ListOrdered, Clock, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BotStep {
  message: string;
  keywords: string[];
  delay_seconds: number;
}

interface MenuConfig {
  welcome_message: string;
  fallback_message: string;
  menu_items: any[];
  trigger_first_message: boolean;
  trigger_keywords: string[];
  steps: BotStep[];
}

const RE_NOME = /\{nome\}/g;
const RE_SAUDACAO = /\{saudacao\}/g;
const VAR_NOME = "{nome}";
const VAR_SAUDACAO = "{saudacao}";

const defaultConfig: MenuConfig = {
  welcome_message: VAR_SAUDACAO + ", " + VAR_NOME + "! Seja bem-vindo(a) à LOUDER.ink! 🖤",
  fallback_message: "",
  menu_items: [],
  trigger_first_message: true,
  trigger_keywords: [],
  steps: [],
};

export default function Bot() {
  const [botActive, setBotActive] = useState(false);
  const [config, setConfig] = useState<MenuConfig>(defaultConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState("");
  const [newStepKeyword, setNewStepKeyword] = useState<Record<number, string>>({});

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
            trigger_first_message: val.trigger_first_message !== false,
            trigger_keywords: Array.isArray(val.trigger_keywords) ? val.trigger_keywords : [],
            steps: Array.isArray(val.steps)
              ? val.steps.map((s: any) => ({
                  message: s.message || "",
                  keywords: Array.isArray(s.keywords) ? s.keywords : [],
                  delay_seconds: Number(s.delay_seconds) || 0,
                }))
              : [],
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
          value: {
            welcome_message: config.welcome_message,
            fallback_message: "",
            menu_items: [],
            trigger_first_message: config.trigger_first_message,
            trigger_keywords: config.trigger_keywords,
            steps: config.steps,
          } as any,
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

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (!kw) return;
    const exists = config.trigger_keywords.some((k) => k.toLowerCase() === kw.toLowerCase());
    if (exists) {
      setNewKeyword("");
      return;
    }
    setConfig((prev) => ({ ...prev, trigger_keywords: [...prev.trigger_keywords, kw] }));
    setNewKeyword("");
  };

  const removeKeyword = (kw: string) => {
    setConfig((prev) => ({ ...prev, trigger_keywords: prev.trigger_keywords.filter((k) => k !== kw) }));
  };

  const MAX_STEPS = 6;

  const addStep = () => {
    setConfig((prev) => {
      if (prev.steps.length >= MAX_STEPS) return prev;
      return { ...prev, steps: [...prev.steps, { message: "", keywords: [], delay_seconds: 5 }] };
    });
  };

  const removeStep = (index: number) => {
    setConfig((prev) => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));
  };

  const updateStep = (index: number, patch: Partial<BotStep>) => {
    setConfig((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  };

  const addStepKeyword = (index: number) => {
    const kw = (newStepKeyword[index] || "").trim();
    if (!kw) return;
    setConfig((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => {
        if (i !== index) return s;
        if (s.keywords.some((k) => k.toLowerCase() === kw.toLowerCase())) return s;
        return { ...s, keywords: [...s.keywords, kw] };
      }),
    }));
    setNewStepKeyword((prev) => ({ ...prev, [index]: "" }));
  };

  const removeStepKeyword = (index: number, kw: string) => {
    setConfig((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) =>
        i === index ? { ...s, keywords: s.keywords.filter((k) => k !== kw) } : s,
      ),
    }));
  };

  const previewText = () => {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo",
        hour: "numeric",
        hour12: false,
      }).format(new Date()),
    ) % 24;
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
                  <Zap className="w-5 h-5 text-primary" />
                  <CardTitle>Gatilhos de Acionamento</CardTitle>
                </div>
                <CardDescription>Defina quando o Bot deve enviar a mensagem automaticamente (respeitando 1 envio por dia por cliente).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label className="text-sm">Acionar na primeira mensagem</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Envia quando o cliente manda a primeira mensagem na conversa.</p>
                  </div>
                  <Switch
                    checked={config.trigger_first_message}
                    onCheckedChange={(v) => setConfig((prev) => ({ ...prev, trigger_first_message: v }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Palavras-chave</Label>
                  <p className="text-xs text-muted-foreground">Se a mensagem do cliente contiver qualquer uma destas palavras, o Bot é acionado.</p>
                  <div className="flex gap-2">
                    <Input
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                      placeholder="Ex: oi, pedido, menu..."
                    />
                    <Button type="button" variant="outline" onClick={addKeyword}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {config.trigger_keywords.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {config.trigger_keywords.map((kw) => (
                        <Badge key={kw} variant="secondary" className="gap-1 text-xs">
                          {kw}
                          <button type="button" onClick={() => removeKeyword(kw)} className="hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground pt-1">Nenhuma palavra-chave cadastrada.</p>
                  )}
                </div>
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

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-primary" />
                  <CardTitle>Sequência de Mensagens</CardTitle>
                </div>
                <CardDescription>
                  Depois da boas-vindas, o Bot aguarda o cliente responder. Se a resposta contiver
                  uma das palavras-chave do passo, ele envia a próxima mensagem (após o atraso definido).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {config.steps.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum passo cadastrado ainda.</p>
                )}
                {config.steps.map((step, index) => (
                  <div key={index} className="border border-border rounded-md p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Passo {index + 1}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeStep(index)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Mensagem</Label>
                      <Textarea
                        value={step.message}
                        onChange={(e) => updateStep(index, { message: e.target.value })}
                        placeholder="Mensagem enviada neste passo..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Palavras-chave para acionar este passo</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newStepKeyword[index] || ""}
                          onChange={(e) => setNewStepKeyword((prev) => ({ ...prev, [index]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addStepKeyword(index); } }}
                          placeholder="Ex: sim, quero, mais..."
                        />
                        <Button type="button" variant="outline" onClick={() => addStepKeyword(index)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      {step.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {step.keywords.map((kw) => (
                            <Badge key={kw} variant="secondary" className="gap-1 text-xs">
                              {kw}
                              <button type="button" onClick={() => removeStepKeyword(index, kw)} className="hover:text-destructive">
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Atraso antes de enviar (segundos)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        value={step.delay_seconds}
                        onChange={(e) => updateStep(index, { delay_seconds: Math.min(20, Math.max(0, Number(e.target.value) || 0)) })}
                        className="w-32"
                      />
                    </div>
                  </div>
                ))}

                {config.steps.length < 6 && (
                  <Button type="button" variant="outline" onClick={addStep} className="w-full">
                    <Plus className="w-4 h-4 mr-2" /> Adicionar passo
                  </Button>
                )}
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
