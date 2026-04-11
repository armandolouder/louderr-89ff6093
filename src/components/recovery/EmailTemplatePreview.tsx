import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Monitor, Smartphone, Eye, AlertCircle } from "lucide-react";

const SAMPLE_PRODUCTS = [
  { name: "Camiseta Oversized Dark Wave", price: 129.9, quantity: 1, image: "https://placehold.co/160x160/111111/ffffff?text=LOUDER" },
  { name: "Moletom Post-Punk Edition", price: 249.9, quantity: 1, image: "https://placehold.co/160x160/1a1a1a/ffffff?text=MOLETOM" },
];

function buildProductGrid(products: typeof SAMPLE_PRODUCTS) {
  const cols = 2;
  let rows = "";
  for (let i = 0; i < products.length; i += cols) {
    const cells = products.slice(i, i + cols).map((p) => {
      const priceFormatted = `R$ ${Number(p.price || 0).toFixed(2).replace(".", ",")}`;
      const qtyLabel = p.quantity && p.quantity > 1 ? `${p.quantity}x ` : "";
      return `<td width="50%" style="padding:4px;vertical-align:top;">
        <div style="background:#f5f5f5;overflow:hidden;">
          ${p.image ? `<img src="${p.image}" alt="${p.name}" width="100%" style="display:block;width:100%;object-fit:cover;" />` : `<div style="width:100%;height:160px;background:#f5f5f5;text-align:center;line-height:160px;font-size:28px;">🛒</div>`}
        </div>
        <div style="padding:8px 4px;">
          <p style="margin:0 0 4px;font-weight:700;font-size:12px;color:#111;text-transform:uppercase;line-height:1.3;">${p.name}</p>
          <p style="margin:0;font-size:13px;font-weight:700;color:#000;">${qtyLabel}${priceFormatted}</p>
        </div>
      </td>`;
    }).join("");
    rows += `<tr>${cells}</tr>`;
  }
  return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:10px;">${rows}</table>`;
}

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
      const totalFormatted = "R$ 379,80";
      const productGrid = buildProductGrid(SAMPLE_PRODUCTS);
      const recoveryUrl = "https://louder.ink/checkout/v3/proxy/1926087182/a43a28e5a4b5d9454a04d142d471d60cdf73e52e";

      let html = template.html_content;
      let subject = template.subject;
      html = html.replace(/\{\{nome\}\}/gi, firstName);
      html = html.replace(/\{\{total\}\}/gi, totalFormatted);
      html = html.replace(/\{\{produtos\}\}/gi, productGrid);
      html = html.replace(/\{\{recovery_url\}\}/gi, recoveryUrl);
      html = html.replace(/\{\{unsubscribe_url\}\}/gi, "#");
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
