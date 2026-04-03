import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Eye, Pencil, Trash2, Code, FileText, Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";
import { BRANDED_TEMPLATES } from "./brandedTemplates";

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;">
<tr><td align="center" style="padding:40px 20px;">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#000;padding:32px 40px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:24px;letter-spacing:2px;">SUA MARCA</h1>
  </td></tr>
  <tr><td style="padding:40px;">
    <h2 style="margin:0 0 16px;font-size:22px;color:#111;">Olá, {{nome}}! 👋</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#666;line-height:1.6;">
      Escreva sua mensagem aqui. Use variáveis como {{nome}} e {{email}} para personalizar.
    </p>
    <a href="#" style="display:inline-block;background:#000;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;">
      CLIQUE AQUI →
    </a>
  </td></tr>
  <tr><td style="background:#f9f9f9;padding:24px 40px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#999;">
      Você recebeu este email porque está cadastrado em nossa base.
      <br/><a href="{{unsubscribe_url}}" style="color:#999;">Cancelar inscrição</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

export function EmailTemplateEditor() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [showGallery, setShowGallery] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", html_content: DEFAULT_TEMPLATE, preview_text: "", category: "geral" });

  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing?.id) {
        const { error } = await supabase.from("email_templates").update({
          name: form.name, subject: form.subject, html_content: form.html_content,
          preview_text: form.preview_text, category: form.category,
        }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("email_templates").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      setEditing(null);
      toast.success(editing?.id ? "Template atualizado!" : "Template criado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template removido!");
    },
  });

  const useTemplateMutation = useMutation({
    mutationFn: async (tpl: typeof BRANDED_TEMPLATES[0]) => {
      const { error } = await supabase.from("email_templates").insert({
        name: tpl.name, subject: tpl.subject, html_content: tpl.html_content,
        preview_text: tpl.preview_text, category: tpl.category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      setShowGallery(false);
      toast.success("Template adicionado à sua biblioteca!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (t: any) => {
    setForm({ name: t.name, subject: t.subject, html_content: t.html_content, preview_text: t.preview_text || "", category: t.category || "geral" });
    setEditing(t);
  };

  const handleNew = () => {
    setForm({ name: "", subject: "", html_content: DEFAULT_TEMPLATE, preview_text: "", category: "geral" });
    setEditing({});
  };

  const handlePreview = (html: string) => {
    setPreviewHtml(html.replace(/\{\{nome\}\}/gi, "Maria").replace(/\{\{email\}\}/gi, "maria@email.com").replace(/\{\{unsubscribe_url\}\}/gi, "#"));
    setShowPreview(true);
  };

  if (isLoading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  // Editor view
  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{editing.id ? "Editar Template" : "Novo Template"}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePreview(form.html_content)}>
              <Eye className="w-4 h-4 mr-1" /> Preview
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input placeholder="Nome do template" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Assunto do email" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input placeholder="Texto de preview (opcional)" value={form.preview_text} onChange={(e) => setForm({ ...form, preview_text: e.target.value })} />
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="geral">Geral</SelectItem>
              <SelectItem value="boas-vindas">Boas-vindas</SelectItem>
              <SelectItem value="promocao">Promoção</SelectItem>
              <SelectItem value="reativacao">Reativação</SelectItem>
              <SelectItem value="lancamento">Lançamento</SelectItem>
              <SelectItem value="informativo">Informativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <Code className="w-3.5 h-3.5" />
          Variáveis: <Badge variant="secondary" className="text-xs">{"{{nome}}"}</Badge>
          <Badge variant="secondary" className="text-xs">{"{{email}}"}</Badge>
          <Badge variant="secondary" className="text-xs">{"{{unsubscribe_url}}"}</Badge>
        </div>
        <Textarea
          placeholder="Código HTML do email"
          value={form.html_content}
          onChange={(e) => setForm({ ...form, html_content: e.target.value })}
          className="font-mono text-xs min-h-[400px]"
        />
        <Button onClick={() => saveMutation.mutate()} disabled={!form.name || !form.subject || saveMutation.isPending} className="w-full">
          {editing.id ? "Salvar Alterações" : "Criar Template"}
        </Button>
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader><DialogTitle>Preview do Email</DialogTitle></DialogHeader>
            <div className="border rounded-lg overflow-auto max-h-[65vh]">
              <iframe srcDoc={previewHtml} className="w-full min-h-[500px] border-0" title="Preview" />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Gallery view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Templates de Email</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowGallery(true)} className="gap-2">
            <Sparkles className="w-4 h-4" /> Galeria LOUDER
          </Button>
          <Button size="sm" onClick={handleNew} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Template
          </Button>
        </div>
      </div>

      {!templates?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhum template</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Comece usando um template da galeria ou crie do zero.</p>
            <Button variant="outline" onClick={() => setShowGallery(true)} className="gap-2">
              <Sparkles className="w-4 h-4" /> Explorar Galeria LOUDER
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id} className="group hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge variant="secondary">{t.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{t.subject}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Usado {t.use_count || 0}x</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handlePreview(t.html_content)}><Eye className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(t)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(t.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Branded Templates Gallery */}
      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Galeria de Templates LOUDER.ink
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            {BRANDED_TEMPLATES.map((tpl, i) => (
              <Card key={i} className="hover:border-primary/30 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{tpl.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs">{tpl.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{tpl.subject.replace("{{nome}}", "Maria")}</p>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden mb-3 bg-muted/30">
                    <iframe
                      srcDoc={tpl.html_content.replace(/\{\{nome\}\}/gi, "Maria").replace(/\{\{unsubscribe_url\}\}/gi, "#")}
                      className="w-full h-48 border-0 pointer-events-none"
                      title={tpl.name}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => handlePreview(tpl.html_content)}>
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </Button>
                    <Button size="sm" className="flex-1 gap-1" onClick={() => useTemplateMutation.mutate(tpl)} disabled={useTemplateMutation.isPending}>
                      <Copy className="w-3.5 h-3.5" /> Usar Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
