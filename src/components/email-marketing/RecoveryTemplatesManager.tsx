import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Pencil, RotateCcw, Monitor, Smartphone, Mail } from "lucide-react";
import { toast } from "sonner";
import { RECOVERY_VARIANTS, buildRecoveryBlocks, RecoveryVariant } from "./recoveryTemplates";
import { EmailBuilder } from "./builder/EmailBuilder";
import { exportToHtml } from "./builder/htmlExporter";
import { EmailBlock } from "./builder/types";

const PRODUTOS_PREVIEW = `<table cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    <td width="50%" style="padding:6px;vertical-align:top;">
      <div style="border:1px solid #e5e5e5;overflow:hidden;background:#fff;">
        <img src="https://placehold.co/300x300/111111/ffffff?text=LOUDER" style="width:100%;display:block;" />
        <div style="padding:8px 10px;">
          <div style="font-size:12px;font-weight:600;color:#333;">CAMISETA DARK WAVE</div>
          <div style="font-size:13px;font-weight:700;color:#111;margin-top:4px;">R$ 129,90</div>
        </div>
      </div>
    </td>
    <td width="50%" style="padding:6px;vertical-align:top;">
      <div style="border:1px solid #e5e5e5;overflow:hidden;background:#fff;">
        <img src="https://placehold.co/300x300/1a1a1a/ffffff?text=LOUDER" style="width:100%;display:block;" />
        <div style="padding:8px 10px;">
          <div style="font-size:12px;font-weight:600;color:#333;">MOLETOM POST-PUNK</div>
          <div style="font-size:13px;font-weight:700;color:#111;margin-top:4px;">R$ 249,90</div>
        </div>
      </div>
    </td>
  </tr>
</table>`;

const TEMPLATE_PREFIX = "[Recuperação]";

function fillPreview(html: string) {
  return html
    .replace(/\{\{nome\}\}/gi, "Marina")
    .replace(/\{\{email\}\}/gi, "marina@email.com")
    .replace(/\{\{unsubscribe_url\}\}/gi, "#")
    .replace(/\{\{recovery_url\}\}/gi, "https://louder.ink/checkout/exemplo")
    .replace(/\{\{total\}\}/gi, "R$ 379,80")
    .replace(/\{\{produtos\}\}/gi, PRODUTOS_PREVIEW);
}

interface SavedTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  variables: any;
}

export function RecoveryTemplatesManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<RecoveryVariant | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  const { data: saved } = useQuery({
    queryKey: ["recovery-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("id, name, subject, html_content, variables")
        .eq("category", "recuperacao");
      if (error) throw error;
      return (data || []) as SavedTemplate[];
    },
  });

  const findSaved = (key: string): SavedTemplate | undefined =>
    saved?.find((t) => (t.variables as any)?.recovery_variant === key);

  // Migração automática: na primeira vez, salva os 5 modelos padrão no banco
  // para que o motor de recuperação já use a versão do builder.
  const seededRef = useRef(false);
  useEffect(() => {
    if (!saved || seededRef.current) return;
    const missing = RECOVERY_VARIANTS.filter((v) => !findSaved(v.key));
    if (missing.length === 0) return;
    seededRef.current = true;
    (async () => {
      const rows = missing.map((v) => {
        const blocks = buildRecoveryBlocks(v);
        const html = exportToHtml({
          blocks,
          selectedBlockId: null,
          globalStyles: { backgroundColor: "#f5f5f5", contentWidth: "600", fontFamily: "'Helvetica Neue',Arial,sans-serif", borderRadius: "0" },
        });
        return {
          name: `${TEMPLATE_PREFIX} ${v.label}`,
          subject: v.subject,
          html_content: html,
          category: "recuperacao",
          variables: { blocks, recovery_variant: v.key } as any,
        };
      });
      const { error } = await supabase.from("email_templates").insert(rows);
      if (!error) queryClient.invalidateQueries({ queryKey: ["recovery-templates"] });
    })();
  }, [saved]);

  const getBlocks = (v: RecoveryVariant): EmailBlock[] => {
    const s = findSaved(v.key);
    const blocks = (s?.variables as any)?.blocks;
    return Array.isArray(blocks) && blocks.length ? blocks : buildRecoveryBlocks(v);
  };

  const saveMutation = useMutation({
    mutationFn: async ({ v, html, blocks }: { v: RecoveryVariant; html: string; blocks: EmailBlock[] }) => {
      const existing = findSaved(v.key);
      const payload = {
        name: `${TEMPLATE_PREFIX} ${v.label}`,
        subject: v.subject,
        html_content: html,
        category: "recuperacao",
        variables: { blocks, recovery_variant: v.key } as any,
      };
      if (existing?.id) {
        const { error } = await supabase.from("email_templates").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("email_templates").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery-templates"] });
      setEditing(null);
      toast.success("Template de recuperação salvo! O motor já usará esta versão.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetMutation = useMutation({
    mutationFn: async (v: RecoveryVariant) => {
      const existing = findSaved(v.key);
      if (existing?.id) {
        const { error } = await supabase.from("email_templates").delete().eq("id", existing.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery-templates"] });
      toast.success("Template restaurado para o modelo padrão.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handlePreview = (v: RecoveryVariant) => {
    const html = exportToHtml({
      blocks: getBlocks(v),
      selectedBlockId: null,
      globalStyles: { backgroundColor: "#f5f5f5", contentWidth: "600", fontFamily: "'Helvetica Neue',Arial,sans-serif", borderRadius: "0" },
    });
    setPreviewHtml(fillPreview(html));
    setShowPreview(true);
  };

  if (editing) {
    return (
      <EmailBuilder
        templateName={`${TEMPLATE_PREFIX} ${editing.label}`}
        templateSubject={findSaved(editing.key)?.subject || editing.subject}
        initialBlocks={getBlocks(editing)}
        onSave={(html, blocks) => saveMutation.mutate({ v: editing, html, blocks })}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Templates do motor de recuperação de carrinho</p>
          <p className="mt-0.5">
            Estes são os 5 modelos enviados automaticamente no fluxo de carrinho abandonado. Edite no builder e o motor
            passa a usar a sua versão. Os blocos <strong>produtos</strong>, <strong>{"{{total}}"}</strong> e o link do
            botão são preenchidos automaticamente com os dados reais do carrinho.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {RECOVERY_VARIANTS.map((v) => {
          const customized = !!findSaved(v.key);
          return (
            <Card key={v.key} className="group hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{v.label}</CardTitle>
                  <Badge variant={customized ? "default" : "secondary"}>
                    {customized ? "Personalizado" : "Padrão"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{v.description}</p>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3 truncate">
                  <strong>Assunto:</strong> {v.subject.replace(/\{\{nome\}\}/gi, "Marina")}
                </p>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => handlePreview(v)}>
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </Button>
                  <Button size="sm" className="flex-1 gap-1.5" onClick={() => setEditing(v)}>
                    <Pencil className="w-3.5 h-3.5" /> Editar no Builder
                  </Button>
                  {customized && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground"
                      title="Restaurar padrão"
                      onClick={() => resetMutation.mutate(v)}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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