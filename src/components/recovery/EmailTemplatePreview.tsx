import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Monitor, Smartphone, Eye, AlertCircle } from "lucide-react";
import { renderEmailPreview } from "@/components/email-marketing/previewData";

export function EmailTemplatePreview() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["recovery-email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("id, name, subject, html_content")
        .eq("is_active", true)
        .or("category.eq.recuperacao,name.ilike.%Recupera%")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const loadPreview = () => {
    const template = templates?.find((t) => t.id === selectedTemplateId);
    if (!template) return;

    setLoading(true);
    try {
      const firstName = "Marina";
      const recoveryUrl = "https://louder.ink/checkout/v3/proxy/1926087182/a43a28e5a4b5d9454a04d142d471d60cdf73e52e";

      const html = renderEmailPreview(template.html_content, {
        name: firstName,
        email: "marina@email.com",
        recoveryUrl,
      });
      let subject = template.subject;
      subject = subject.replace(/\{\{nome\}\}/gi, firstName);

      setPreviewHtml(html);
      setPreviewSubject(subject);
    } finally {
      setLoading(false);
    }
  };

  const hasTemplates = templates && templates.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="w-4 h-4" /> Preview de Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {templatesLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !hasTemplates ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>Nenhum template de recuperação encontrado. Crie templates com categoria <strong>"recuperacao"</strong> no Email Builder.</p>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-3">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={loadPreview} disabled={loading || !selectedTemplateId} size="sm">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                Visualizar
              </Button>
            </div>

            {previewHtml && (
              <>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground flex-1">
                    <strong>Assunto:</strong> {previewSubject}
                  </p>
                  <div className="flex border rounded-md overflow-hidden">
                    <button
                      onClick={() => setViewMode("desktop")}
                      className={`p-1.5 ${viewMode === "desktop" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode("mobile")}
                      className={`p-1.5 ${viewMode === "mobile" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div
                  className="border rounded-lg overflow-hidden mx-auto bg-muted"
                  style={{ width: viewMode === "mobile" ? 375 : "100%", maxHeight: 600, overflowY: "auto" }}
                >
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full border-0"
                    style={{ height: 580, pointerEvents: "none" }}
                    title="Email Preview"
                    sandbox=""
                  />
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
