import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, Palette, Ruler, Copy, FileBarChart, AlertTriangle, CheckCircle2, Layers, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuditData {
  summary: { products: number; variants: number; images: number; categories: number; colors: number; sizes: number };
  colors: { color: string; count: number }[];
  color_inconsistencies: { normalized: string; variants: string[]; total: number }[];
  sizes: { size: string; count: number }[];
  categories: { category: string; products: number; variants: number }[];
  models: { variant_count: number; products: number }[];
  duplicates: { name: string; count: number; ids: string[] }[];
  data_quality: {
    no_color: number; no_size: number; no_price: number; no_sku: number;
    no_stock: number; no_images: number; one_image: number;
  };
}

const fmt = (n: number) => n.toLocaleString("pt-BR");

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-2 bg-secondary/50 w-full overflow-hidden">
      <div className="h-full bg-primary" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
    </div>
  );
}

export default function CatalogAudit() {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(false);

  const runAudit = useCallback(async () => {
    setLoading(true);
    try {
      const { data: result, error } = await (supabase as any).rpc("audit_catalog");
      if (error) throw error;
      setData(result as AuditData);
    } catch (err: any) {
      toast.error(err.message || "Erro ao executar auditoria");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { runAudit(); }, [runAudit]);

  if (loading && !data) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!data) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-sm text-muted-foreground">Nenhum dado de auditoria. Sincronize o catálogo primeiro.</p>
        <Button variant="outline" onClick={runAudit}><RefreshCw className="w-4 h-4 mr-2" />Executar auditoria</Button>
      </div>
    );
  }

  const dq = data.data_quality;
  const totalVar = data.summary.variants || 1;
  const issues = [
    { label: "Variações sem SKU", value: dq.no_sku, of: totalVar, critical: dq.no_sku > totalVar * 0.5 },
    { label: "Variações sem estoque definido", value: dq.no_stock, of: totalVar, critical: dq.no_stock > totalVar * 0.5 },
    { label: "Variações sem cor", value: dq.no_color, of: totalVar, critical: false },
    { label: "Variações sem preço", value: dq.no_price, of: totalVar, critical: dq.no_price > 0 },
    { label: "Variações sem tamanho", value: dq.no_size, of: totalVar, critical: false },
    { label: "Produtos sem imagem", value: dq.no_images, of: data.summary.products, critical: dq.no_images > 0 },
    { label: "Produtos com 1 imagem só", value: dq.one_image, of: data.summary.products, critical: false },
  ];

  const maxColor = Math.max(...data.colors.map((c) => c.count), 1);
  const maxSize = Math.max(...data.sizes.map((s) => s.count), 1);
  const maxCat = Math.max(...data.categories.map((c) => c.products), 1);
  const maxModel = Math.max(...data.models.map((m) => m.products), 1);
  const dupTotal = data.duplicates.reduce((s, d) => s + (d.count - 1), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Análise automática do catálogo importado</p>
        <Button variant="outline" size="sm" onClick={runAudit} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Reanalisar
        </Button>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports"><FileBarChart className="w-4 h-4 mr-2" />Relatórios</TabsTrigger>
          <TabsTrigger value="models"><Layers className="w-4 h-4 mr-2" />Modelos</TabsTrigger>
          <TabsTrigger value="colors"><Palette className="w-4 h-4 mr-2" />Cores</TabsTrigger>
          <TabsTrigger value="duplicates"><Copy className="w-4 h-4 mr-2" />Duplicidades</TabsTrigger>
        </TabsList>

        {/* RELATÓRIOS */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Qualidade dos dados</CardTitle>
              <CardDescription>Lacunas encontradas no catálogo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {issues.map((iss) => {
                const pct = iss.of > 0 ? (iss.value / iss.of) * 100 : 0;
                return (
                  <div key={iss.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {iss.value === 0 ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : iss.critical ? (
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                        {iss.label}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {fmt(iss.value)} <span className="text-xs">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><FolderTree className="w-4 h-4" />Categorias</CardTitle>
              <CardDescription>{data.categories.length} categorias</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.categories.map((c) => (
                <div key={c.category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">{c.category}</span>
                    <span className="text-muted-foreground tabular-nums">{fmt(c.products)} prod. · {fmt(c.variants)} var.</span>
                  </div>
                  <Bar value={c.products} max={maxCat} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MODELOS */}
        <TabsContent value="models" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Modelos por nº de variações</CardTitle>
              <CardDescription>Distribuição dos produtos pela quantidade de variações (grade de cores × tamanhos)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.models.map((m) => (
                <div key={m.variant_count} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{m.variant_count} variações</span>
                    <span className="text-muted-foreground tabular-nums">{fmt(m.products)} produtos</span>
                  </div>
                  <Bar value={m.products} max={maxModel} />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Ruler className="w-4 h-4" />Tamanhos</CardTitle>
              <CardDescription>{data.summary.sizes} tamanhos distintos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.sizes.map((s) => (
                <div key={s.size} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{s.size}</span>
                    <span className="text-muted-foreground tabular-nums">{fmt(s.count)}</span>
                  </div>
                  <Bar value={s.count} max={maxSize} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CORES */}
        <TabsContent value="colors" className="space-y-4 mt-4">
          {data.color_inconsistencies.length > 0 && (
            <Card className="border-amber-500/40">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />Inconsistências de nomenclatura
                </CardTitle>
                <CardDescription>Cores com nomes diferentes que provavelmente são a mesma — padronize para evitar fragmentação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.color_inconsistencies.map((ci) => (
                  <div key={ci.normalized} className="flex items-center justify-between gap-3 border border-border p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {ci.variants.map((v) => <Badge key={v} variant="secondary">{v}</Badge>)}
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">{fmt(ci.total)} var.</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" />Distribuição de cores</CardTitle>
              <CardDescription>{data.summary.colors} cores distintas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.colors.map((c) => (
                <div key={c.color} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{c.color}</span>
                    <span className="text-muted-foreground tabular-nums">{fmt(c.count)}</span>
                  </div>
                  <Bar value={c.count} max={maxColor} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DUPLICIDADES */}
        <TabsContent value="duplicates" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Produtos duplicados</CardTitle>
              <CardDescription>
                {data.duplicates.length} nomes repetidos · {fmt(dupTotal)} produtos excedentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.duplicates.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600 py-4">
                  <CheckCircle2 className="w-4 h-4" />Nenhum produto duplicado encontrado.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.duplicates.map((d, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 border border-border p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{d.name}</p>
                        <p className="text-xs text-muted-foreground">IDs: {d.ids.join(", ")}</p>
                      </div>
                      <Badge variant="destructive" className="whitespace-nowrap">{d.count}×</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}