import { useState, useEffect } from "react";
import { User, Phone, Mail, LogOut, Loader2, Save, Bot, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface BotConfig {
  system_prompt: string;
  model: string;
  max_tokens: number;
}

export default function Settings() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // Bot settings
  const [botActive, setBotActive] = useState(false);
  const [botConfig, setBotConfig] = useState<BotConfig>({
    system_prompt: "Você é um assistente de atendimento ao cliente da loja. Seja educado, prestativo e responda de forma concisa. Responda em português brasileiro.",
    model: "llama-3.3-70b-versatile",
    max_tokens: 512,
  });
  const [isSavingBot, setIsSavingBot] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchBotSettings();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserEmail(user.email || "");
      setUserPhone(user.phone || "");

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
      }

      if (profileData) {
        setProfile(profileData);
        setName(profileData.name || "");
        if (profileData.phone) {
          setUserPhone(profileData.phone);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBotSettings = async () => {
    try {
      const { data } = await supabase
        .from("bot_settings" as any)
        .select("*")
        .eq("key", "chatbot_nuvemshop")
        .single();

      if (data) {
        setBotActive((data as any).is_active || false);
        const val = (data as any).value as BotConfig;
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
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name })
        .eq("id", profile.id);

      if (error) {
        console.error("Error updating profile:", error);
        toast.error("Erro ao salvar perfil");
      } else {
        toast.success("Perfil atualizado!");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao salvar perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBot = async () => {
    setIsSavingBot(true);
    try {
      const { error } = await supabase
        .from("bot_settings" as any)
        .update({
          is_active: botActive,
          value: botConfig,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("key", "chatbot_nuvemshop");

      if (error) {
        console.error("Error saving bot settings:", error);
        toast.error("Erro ao salvar configurações do bot");
      } else {
        toast.success(botActive ? "Bot ativado!" : "Bot desativado!");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao salvar");
    } finally {
      setIsSavingBot(false);
    }
  };

  const handleToggleBot = async (active: boolean) => {
    setBotActive(active);
    // Auto-save on toggle
    try {
      await supabase
        .from("bot_settings" as any)
        .update({
          is_active: active,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("key", "chatbot_nuvemshop");

      toast.success(active ? "Bot ativado!" : "Bot desativado!");
    } catch (error) {
      console.error("Error toggling bot:", error);
      setBotActive(!active);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logout realizado");
      navigate("/auth");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Erro ao fazer logout");
    }
  };

  const formatPhone = (phone: string) => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 12) {
      return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    return phone;
  };

  const getInitials = () => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return "U";
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie sua conta e preferências</p>
      </div>

      {/* Chatbot Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <CardTitle>Bot de Respostas Automáticas</CardTitle>
            </div>
            <Switch
              checked={botActive}
              onCheckedChange={handleToggleBot}
            />
          </div>
          <CardDescription>
            Responde automaticamente via IA apenas para clientes que estão na sua base da Nuvemshop
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {botActive ? (
                <span className="text-green-600 font-medium">Ativo — respondendo clientes Nuvemshop</span>
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
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">Modelo IA</Label>
              <Input
                id="model"
                value={botConfig.model}
                onChange={(e) => setBotConfig({ ...botConfig, model: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-tokens">Max Tokens</Label>
              <Input
                id="max-tokens"
                type="number"
                value={botConfig.max_tokens}
                onChange={(e) => setBotConfig({ ...botConfig, max_tokens: parseInt(e.target.value) || 512 })}
              />
            </div>
          </div>

          <Button onClick={handleSaveBot} disabled={isSavingBot} size="sm">
            {isSavingBot ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Configurações do Bot
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Perfil
          </CardTitle>
          <CardDescription>
            Suas informações pessoais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{name || "Usuário"}</p>
              <p className="text-sm text-muted-foreground">{formatPhone(userPhone)}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formatPhone(userPhone)}
                  disabled
                  className="pl-10 bg-secondary/50"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                O telefone não pode ser alterado
              </p>
            </div>

            {userEmail && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={userEmail}
                    disabled
                    className="pl-10 bg-secondary/50"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sessão</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair da conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}