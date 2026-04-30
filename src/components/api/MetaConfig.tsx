import { useState } from "react";
import { Instagram, Copy, Check, ExternalLink, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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

export function MetaConfig() {
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
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
          Aguardando configuração
        </Badge>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-foreground/80">
            <p className="font-medium text-foreground mb-1">Infraestrutura pronta</p>
            <p>
              As URLs HTTPS abaixo já estão ativas. Use-as no painel da Meta para configurar OAuth e Webhook.
              Depois adicione <code className="bg-background px-1.5 py-0.5 text-xs">META_APP_ID</code> e{" "}
              <code className="bg-background px-1.5 py-0.5 text-xs">META_APP_SECRET</code> nos Secrets para ativar a conexão completa.
            </p>
          </div>
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