import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Eye, Pencil, Trash2, FileText, Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";
import { BRANDED_TEMPLATES } from "./brandedTemplates";
import { EmailBuilder } from "./builder/EmailBuilder";
import { EmailBlock } from "./builder/types";

export function EmailTemplateEditor() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [showGallery, setShowGallery] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ html, name, subject, blocks }: { html: string; name: string; subject: string; blocks: EmailBlock[] }) => {
      if (editing?.id) {
        const { error } = await supabase.from("email_templates").update({
          name, subject, html_content: html, category: "geral", variables: { blocks } as any,
        }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("email_templates").insert({
          name, subject, html_content: html, category: "geral", variables: { blocks } as any,
        });
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

  const handlePreview = (html: string) => {
    setPreviewHtml(html.replace(/\{\{nome\}\}/gi, "Maria").replace(/\{\{email\}\}/gi, "maria@email.com").replace(/\{\{unsubscribe_url\}\}/gi, "#"));
    setShowPreview(true);
  };

  if (isLoading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  // Builder view
  if (editing) {
    return (
      <EmailBuilder
        templateName={editing.name || ""}
        templateSubject={editing.subject || ""}
        onSave={(html, _blocks) => {
          const nameInput = document.querySelector<HTMLInputElement>('input[placeholder="Nome do template"]');
          const subjectInput = document.querySelector<HTMLInputElement>('input[placeholder="Assunto do email"]');
          saveMutation.mutate({
            html,
            name: nameInput?.value || editing.name || "Sem nome",
            subject: subjectInput?.value || editing.subject || "Sem assunto",
          });
        }}
        onCancel={() => setEditing(null)}
      />
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
          <Button size="sm" onClick={() => setEditing({})} className="gap-2">
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
                    <Button size="icon" variant="ghost" onClick={() => setEditing(t)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(t.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader><DialogTitle>Preview do Email</DialogTitle></DialogHeader>
          <div className="border rounded-lg overflow-auto max-h-[65vh]">
            <iframe srcDoc={previewHtml} className="w-full min-h-[500px] border-0" title="Preview" />
          </div>
        </DialogContent>
      </Dialog>

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
