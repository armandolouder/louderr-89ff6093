import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Monitor, Smartphone, Eye } from "lucide-react";

const STEP_TYPES = [
  { value: "emocional", label: "💜 Emocional" },
  { value: "urgencia", label: "⚡ Urgência" },
  { value: "incentivo", label: "🎁 Incentivo" },
  { value: "ultima_chamada", label: "⏰ Última Chamada" },
  { value: "leve", label: "👋 Leve" },
];

const SAMPLE_PRODUCTS = [
  { name: "Camiseta Oversized Dark Wave", price: 129.9, quantity: 1, image: "https://placehold.co/160x160/111111/ffffff?text=LOUDER" },
  { name: "Moletom Post-Punk Edition", price: 249.9, quantity: 1, image: "https://placehold.co/160x160/1a1a1a/ffffff?text=MOLETOM" },
];

export function EmailTemplatePreview() {
  const [stepType, setStepType] = useState("emocional");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  const loadPreview = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-brevo-email", {
        body: {
          action: "preview-template",
          stepType,
          customerName: "Marina",
          products: SAMPLE_PRODUCTS,
          total: 379.8,
          recoveryUrl: "https://louder.ink/checkout/v3/proxy/1926087182/a43a28e5a4b5d9454a04d142d471d60cdf73e52e",
        },
      });

      if (error) throw error;
      if (data?.success) {
        setPreviewHtml(data.html);
        setPreviewSubject(data.subject);
      }
    } catch (err: any) {
      console.error("Preview error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="w-4 h-4" /> Preview de Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="space-y-1 flex-1">
            <Label className="text-xs">Tipo de mensagem</Label>
            <Select value={stepType} onValueChange={setStepType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STEP_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={loadPreview} disabled={loading} size="sm">
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
              className="border rounded-lg overflow-hidden mx-auto bg-[#f5f5f5]"
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
      </CardContent>
    </Card>
  );
}
