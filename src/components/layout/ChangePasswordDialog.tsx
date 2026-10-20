import { useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { changeAccountPassword } from "@/lib/accountActions";
import { toast } from "sonner";

export function ChangePasswordDialog({ collapsed = false }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const reset = () => {
    setCurrentPassword(""); setPassword(""); setConfirmation(""); setVisible(false); setError("");
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError("");
    try {
      await changeAccountPassword(supabase.auth, currentPassword, password, confirmation);
      reset(); setOpen(false);
      toast.success("Senha alterada com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível alterar a senha. Tente novamente.");
    } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(next) => { if (saving) return; setOpen(next); reset(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" title="Alterar senha" aria-label="Alterar senha" className="w-full justify-start gap-3 px-3 text-muted-foreground hover:bg-sidebar-accent">
          <KeyRound className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Alterar senha</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] rounded-none">
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
          <DialogDescription>Senha de acesso à sua conta LOUDER.ink.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account-current-password">Senha atual</Label>
            <Input id="account-current-password" type={visible ? "text" : "password"} autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required disabled={saving} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-new-password">Nova senha</Label>
            <Input id="account-new-password" type={visible ? "text" : "password"} autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required disabled={saving} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-confirm-password">Confirmar nova senha</Label>
            <Input id="account-confirm-password" type={visible ? "text" : "password"} autoComplete="new-password" minLength={6} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required disabled={saving} />
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setVisible(!visible)} aria-pressed={visible} disabled={saving}>
            {visible ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {visible ? "Ocultar senhas" : "Mostrar senhas"}
          </Button>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { reset(); setOpen(false); }} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              {saving ? "Salvando…" : "Salvar senha"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}