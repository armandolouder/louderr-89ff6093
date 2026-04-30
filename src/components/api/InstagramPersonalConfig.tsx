import { useEffect, useState } from "react";
import { Instagram, Loader2, CheckCircle, AlertTriangle, ExternalLink, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Cred {
  id: string;
  ig_username: string | null;
  ig_user_id: string | null;
  status: string;
  last_verified_at: string | null;
  last_inbox_check_at: string | null;
  error_message: string | null;
}

export function InstagramPersonalConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [cred, setCred] = useState<Cred | null>(null);
  const [showCookies, setShowCookies] = useState(false);

  const [form, setForm] = useState({
    ig_username: "",
    ig_user_id: "",
    sessionid: "",
    csrftoken: "",
    ds_user_id: "",
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("instagram_personal_credentials")
      .select("id, ig_username, ig_user_id, status, last_verified_at, last_inbox_check_at, error_message")
      .maybeSingle();
    if (data) {
      setCred(data);
      setForm((f) => ({
        ...f,
        ig_username: data.ig_username ?? "",
        ig_user_id: data.ig_user_id ?? "",
      }));
    }
    setLoading(false);
  }

  async function save() {
    if (!form.sessionid.trim()) {
      toast.error("Cole o sessionid antes de salvar");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ig_username: form.ig_username.trim() || null,
        ig_user_id: form.ig_user_id.trim() || null,
        sessionid: form.sessionid.trim(),
        csrftoken: form.csrftoken.trim() || null,
        ds_user_id: form.ds_user_id.trim() || null,
        status: "active",
        error_message: null,
      };

      if (cred) {
        const { error } = await supabase
          .from("instagram_personal_credentials")
          .update(payload)
          .eq("id", cred.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("instagram_personal_credentials")
          .insert(payload);
        if (error) throw error;
      }
      toast.success("Credenciais salvas");
      setForm((f) => ({ ...f, sessionid: "", csrftoken: "", ds_user_id: "" }));
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function testFetch() {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-personal-fetch");
      if (error) throw error;
      if (data?.success) {
        toast.success("Conexão OK — mensagens sincronizadas");
      } else {
        toast.error(data?.error ?? "Falha no teste");
      }
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isActive = cred?.status === "active";
  const isExpired = cred?.status === "expired";
  const isCheckpoint = cred?.status === "checkpoint";

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-pink-500/10 flex items-center justify-center">
          <Instagram className="w-6 h-6 text-pink-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Instagram Pessoal</h1>
          <p className="text-sm text-muted-foreground">
            Envia e recebe DMs usando o cookie da sua sessão (uso pessoal — não para disparos em massa).
          </p>
        </div>
      </div>

      {cred && (
        <div className="mb-6 p-4 border border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isActive && <CheckCircle className="w-4 h-4 text-green-500" />}
              {(isExpired || isCheckpoint) && <AlertTriangle className="w-4 h-4 text-amber-500" />}
              <span className="font-medium text-sm">
                @{cred.ig_username ?? "—"}
              </span>
              <span className={`text-xs px-2 py-0.5 ${
                isActive ? "bg-green-500/10 text-green-600" :
                isExpired ? "bg-red-500/10 text-red-600" :
                "bg-amber-500/10 text-amber-600"
              }`}>
                {isActive ? "Ativo" : isExpired ? "Cookie expirado" : isCheckpoint ? "Checkpoint Meta" : cred.status}
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={testFetch} disabled={testing}>
              {testing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Testar e sincronizar
            </Button>
          </div>
          {cred.error_message && (
            <p className="text-xs text-destructive mt-2">{cred.error_message}</p>
          )}
          {cred.last_inbox_check_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Última sincronização: {new Date(cred.last_inbox_check_at).toLocaleString("pt-BR")}
            </p>
          )}
        </div>
      )}

      <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/20 text-sm">
        <strong>⚠️ Aviso de risco:</strong> esse método usa um cookie privado do seu navegador. O Instagram pode invalidar a sessão se detectar uso por data center.
        Use exclusivamente para responder seus clientes — sem disparos em massa.
      </div>

      <div className="mb-6">
        <h3 className="font-semibold text-sm mb-3">Como pegar os cookies</h3>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-4">
          <li>Abra <a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">instagram.com <ExternalLink className="w-3 h-3" /></a> e faça login normalmente.</li>
          <li>Pressione <kbd className="px-1.5 py-0.5 bg-secondary text-xs">F12</kbd> para abrir o DevTools.</li>
          <li>Vá em <strong>Application</strong> (ou <strong>Storage</strong>) → <strong>Cookies</strong> → <strong>https://www.instagram.com</strong>.</li>
          <li>Copie o valor de <code className="bg-secondary px-1">sessionid</code>, <code className="bg-secondary px-1">csrftoken</code> e <code className="bg-secondary px-1">ds_user_id</code>.</li>
          <li>Cole abaixo e salve. O <code className="bg-secondary px-1">ds_user_id</code> também é o seu IG User ID.</li>
        </ol>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">@ do Instagram</Label>
            <Input
              placeholder="louder.ink"
              value={form.ig_username}
              onChange={(e) => setForm({ ...form, ig_username: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">IG User ID (= ds_user_id)</Label>
            <Input
              placeholder="1234567890"
              value={form.ig_user_id}
              onChange={(e) => setForm({ ...form, ig_user_id: e.target.value })}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs">sessionid {cred ? "(deixe em branco para manter o atual)" : ""}</Label>
            <button
              type="button"
              onClick={() => setShowCookies(!showCookies)}
              className="text-xs text-muted-foreground inline-flex items-center gap-1"
            >
              {showCookies ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showCookies ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <Input
            type={showCookies ? "text" : "password"}
            placeholder="ex: 12345678%3AabcDEFghi%3A12%3AAYf..."
            value={form.sessionid}
            onChange={(e) => setForm({ ...form, sessionid: e.target.value })}
          />
        </div>

        <div>
          <Label className="text-xs">csrftoken</Label>
          <Input
            type={showCookies ? "text" : "password"}
            placeholder="ex: AbCdEfGhIjKl..."
            value={form.csrftoken}
            onChange={(e) => setForm({ ...form, csrftoken: e.target.value })}
          />
        </div>

        <div>
          <Label className="text-xs">ds_user_id</Label>
          <Input
            type={showCookies ? "text" : "password"}
            placeholder="ex: 12345678"
            value={form.ds_user_id}
            onChange={(e) => setForm({ ...form, ds_user_id: e.target.value })}
          />
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {cred ? "Atualizar credenciais" : "Salvar credenciais"}
        </Button>
      </div>
    </div>
  );
}