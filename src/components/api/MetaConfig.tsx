import { useState, useEffect } from "react";
import { Instagram, Copy, Check, ExternalLink, AlertCircle, Eye, EyeOff, Save, Loader2, KeyRound, Link2, Unplug } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_PROJECT_REF = "ynawiygjzkypuvenvroi";
const FUNCTIONS_BASE = `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1`;

const WEBHOOK_URL = `${FUNCTIONS_BASE}/meta-webhook`;
const OAUTH_REDIRECT_URL = `${FUNCTIONS_BASE}/meta-oauth-callback`;
const VERIFY_TOKEN_DEFAULT = "louder_meta_verify_2026";

const REQUIRED_PERMISSIONS = [
  "instagram_basic",
  "instagram_manage_comments",
  "instagram_manage_messages",
  "pages_show_list",
  "pages_messaging",
  "pages_manage_metadata",
  "pages_read_engagement",
  "business_management",
];

const WEBHOOK_FIELDS = [
  { object: "Instagram", fields: ["comments", "messages", "mentions", "live_comments"] },
  { object: "Page (Messenger)", fields: ["messages", "messaging_postbacks", "feed"] },
];

function CopyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} copiado`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      <div className="flex gap-2">
        <Input value={value} readOnly className="font-mono text-xs bg-secondary/50" />
        <Button size="icon" variant="outline" onClick={copy} className="shrink-0">
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

interface MetaIntegration {
  id: string;
  page_name: string | null;
  page_id: string;
  instagram_username: string | null;
  instagram_business_account_id: string | null;
  webhook_subscribed: boolean | null;
  status: string;
}

export function MetaConfig() {
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [integrations, setIntegrations] = useState<MetaIntegration[]>([]);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    loadCredentials();
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("meta_integrations" as any)
        .select("id, page_name, page_id, instagram_username, instagram_business_account_id, webhook_subscribed, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setIntegrations((data as any) || []);
    } catch (e) {
      console.error(e);
    }
  };

  const startOAuth = async () => {
    if (!hasCredentials) {
      toast.error("Salve App ID e Secret antes de conectar");
      return;
    }
    setConnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // gera state
      const state = crypto.randomUUID();
      const { error: stateErr } = await supabase
        .from("meta_oauth_states" as any)
        .insert({ user_id: user.id, state, redirect_uri: OAUTH_REDIRECT_URL });
      if (stateErr) throw stateErr;

      const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: OAUTH_REDIRECT_URL,
        state,
        scope: REQUIRED_PERMISSIONS.join(","),
        response_type: "code",
      });
      window.location.href = `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
    } catch (e: any) {
      toast.error(e.message || "Erro ao iniciar conexão");
      setConnecting(false);
    }
  };

  const disconnect = async (id: string) => {
    if (!confirm("Desconectar esta página?")) return;
    const { error } = await supabase.from("meta_integrations" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Página desconectada");
      loadIntegrations();
    }
  };

  const loadCredentials = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("meta_credentials" as any)
        .select("app_id, app_secret, webhook_verify_token")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        const row = data as any;
        setAppId(row.app_id || "");
        setAppSecret(row.app_secret || "");
        setVerifyToken(row.webhook_verify_token || VERIFY_TOKEN_DEFAULT);
        setHasCredentials(!!(row.app_id && row.app_secret));
      } else {
        setVerifyToken(VERIFY_TOKEN_DEFAULT);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveCredentials = async () => {
    if (!appId.trim() || !appSecret.trim() || !verifyToken.trim()) {
      toast.error("Preencha os 3 campos");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("meta_credentials" as any)
        .upsert({
          user_id: user.id,
          app_id: appId.trim(),
          app_secret: appSecret.trim(),
          webhook_verify_token: verifyToken.trim(),
        }, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("Credenciais da Meta salvas!");
      setHasCredentials(true);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
          <Instagram className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Meta (Instagram + Messenger)</h1>
          <p className="text-muted-foreground text-sm">
            DMs do Instagram, comentários e mensagens do Messenger via Graph API.
          </p>
        </div>
        <Badge
          variant="outline"
          className={hasCredentials
            ? "bg-green-500/10 text-green-600 border-green-500/30"
            : "bg-amber-500/10 text-amber-600 border-amber-500/30"
          }
        >
          {hasCredentials ? "Credenciais salvas" : "Aguardando configuração"}
        </Badge>
      </div>

      {/* Conectar com Facebook */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Conectar conta Instagram / Facebook</CardTitle>
          </div>
          <CardDescription>
            Autorize o app a acessar suas páginas e contas do Instagram Business para receber DMs e comentários.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {integrations.length > 0 && (
            <div className="space-y-2">
              {integrations.map((it) => (
                <div key={it.id} className="flex items-center justify-between border border-border bg-secondary/30 px-3 py-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{it.page_name || it.page_id}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {it.instagram_username ? `@${it.instagram_username}` : "Sem Instagram vinculado"}
                      {" · "}
                      {it.webhook_subscribed ? "Webhook ativo" : "Webhook pendente"}
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => disconnect(it.id)}>
                    <Unplug className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button
            onClick={startOAuth}
            disabled={connecting || !hasCredentials}
            className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
          >
            {connecting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Link2 className="w-4 h-4 mr-2" />
            )}
            {integrations.length > 0 ? "Conectar outra página" : "Conectar com Facebook"}
          </Button>
          {!hasCredentials && (
            <p className="text-[11px] text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Salve as credenciais acima antes de conectar.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Formulário de credenciais */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Credenciais da Meta</CardTitle>
          </div>
          <CardDescription>
            Cole os valores do seu App em developers.facebook.com → Settings → Basic
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">META_APP_ID</Label>
                <Input
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="Ex: 1234567890123456"
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">META_APP_SECRET</Label>
                <div className="relative">
                  <Input
                    type={showSecret ? "text" : "password"}
                    value={appSecret}
                    onChange={(e) => setAppSecret(e.target.value)}
                    placeholder="Cole o App Secret"
                    className="font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">META_WEBHOOK_VERIFY_TOKEN</Label>
                <div className="relative">
                  <Input
                    type={showToken ? "text" : "password"}
                    value={verifyToken}
                    onChange={(e) => setVerifyToken(e.target.value)}
                    placeholder="String de validação do webhook"
                    className="font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Use o mesmo valor que você vai colar no painel da Meta em Webhooks → Verify Token.
                </p>
              </div>

              <Button onClick={saveCredentials} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar credenciais
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* URLs para configurar no painel da Meta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">URLs HTTPS para o painel da Meta</CardTitle>
          <CardDescription>Copie e cole nos campos correspondentes em developers.facebook.com</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyField
            label="Webhook → Callback URL"
            value={WEBHOOK_URL}
            hint="Webhooks → Edit Subscription"
          />
          <CopyField
            label="Webhook → Verify Token"
            value={VERIFY_TOKEN_DEFAULT}
            hint="String compartilhada de validação"
          />
          <CopyField
            label="Facebook Login → Valid OAuth Redirect URI"
            value={OAUTH_REDIRECT_URL}
            hint="Settings → Client OAuth Settings"
          />
        </CardContent>
      </Card>

      {/* Permissões */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permissões necessárias</CardTitle>
          <CardDescription>Solicite essas permissões no App Review da Meta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {REQUIRED_PERMISSIONS.map((perm) => (
              <code key={perm} className="text-xs bg-secondary px-2.5 py-1 font-mono">
                {perm}
              </code>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Campos de webhook */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campos do Webhook a inscrever</CardTitle>
          <CardDescription>Em "Webhooks" no painel, inscreva esses fields para cada objeto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {WEBHOOK_FIELDS.map((group) => (
            <div key={group.object}>
              <p className="text-sm font-medium text-foreground mb-2">{group.object}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.fields.map((f) => (
                  <code key={f} className="text-xs bg-secondary px-2 py-1 font-mono">
                    {f}
                  </code>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Passos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximos passos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="space-y-2 list-decimal list-inside text-foreground/80">
            <li>Acesse <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1">Meta for Developers <ExternalLink className="w-3 h-3" /></a> e abra seu App.</li>
            <li>Em <strong>Facebook Login → Settings</strong>, cole a Redirect URI acima.</li>
            <li>Em <strong>Webhooks</strong>, cole a Callback URL e o Verify Token, depois inscreva os fields acima.</li>
            <li>Solicite as permissões listadas em <strong>App Review</strong>.</li>
            <li>Quando o App estiver aprovado, adicione <code className="text-xs bg-secondary px-1.5 py-0.5">META_APP_ID</code> e <code className="text-xs bg-secondary px-1.5 py-0.5">META_APP_SECRET</code> nos Secrets para ativar conexão automática.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}