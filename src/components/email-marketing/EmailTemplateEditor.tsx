import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Eye, Pencil, Trash2, FileText, Monitor, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { EmailBuilder } from "./builder/EmailBuilder";
import { EmailBlock } from "./builder/types";
import { renderEmailPreview } from "./previewData";

export function EmailTemplateEditor() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

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
      const inferredCategory = editing?.category === "recuperacao" || /recupera[cç][aã]o/i.test(name)
        ? "recuperacao"
        : "geral";

      if (editing?.id) {
        const { error } = await supabase.from("email_templates").update({
          name,
          subject,
          html_content: html,
          category: inferredCategory,
          variables: { blocks } as any,
        }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("email_templates").insert({
          name,
          subject,
          html_content: html,
          category: inferredCategory,
          variables: { blocks } as any,
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

  const handlePreview = (html: string) => {
    setPreviewHtml(renderEmailPreview(html));
    setShowPreview(true);
  };

  const getTemplateBlocks = (template: any): EmailBlock[] | undefined => {
    const variables = template?.variables;

    if (variables && typeof variables === "object" && !Array.isArray(variables) && Array.isArray((variables as any).blocks)) {
      return (variables as any).blocks as EmailBlock[];
    }

    return undefined;
  };

  if (isLoading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  // Builder view
  if (editing) {
    return (
      <EmailBuilder
        templateName={editing.name || ""}
        templateSubject={editing.subject || ""}
        initialBlocks={getTemplateBlocks(editing)}
        onSave={(html, blocks) => {
          const nameInput = document.querySelector<HTMLInputElement>('input[placeholder="Nome do template"]');
          const subjectInput = document.querySelector<HTMLInputElement>('input[placeholder="Assunto do email"]');
          saveMutation.mutate({
            html,
            blocks,
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
            <p className="text-sm text-muted-foreground mt-1 mb-4">Crie seu primeiro template do zero.</p>
            <Button variant="outline" onClick={() => setEditing({})} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Template
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
                    <Button size="icon" variant="ghost" aria-label="Pré-visualizar template" title="Pré-visualizar" onClick={() => handlePreview(t.html_content)}><Eye className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Editar template" title="Editar" onClick={() => setEditing(t)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Excluir template" title="Excluir" onClick={() => deleteMutation.mutate(t.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
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
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3 pr-6">
              <span>Preview do Email</span>
              <div className="flex items-center gap-1">
                <Button variant={previewMode === "desktop" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("desktop")} className="gap-1.5">
                  <Monitor className="w-4 h-4" /> Desktop
                </Button>
                <Button variant={previewMode === "mobile" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("mobile")} className="gap-1.5">
                  <Smartphone className="w-4 h-4" /> Mobile
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-auto max-h-[65vh] flex justify-center bg-muted/30 p-3">
            <iframe
              srcDoc={previewHtml}
              title="Preview"
              className="border-0 bg-white transition-all"
              style={{ width: previewMode === "mobile" ? 375 : "100%", minHeight: 500 }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
