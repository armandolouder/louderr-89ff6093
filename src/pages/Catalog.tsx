import { useState, useEffect, useCallback } from "react";
import { Download, Loader2, RefreshCw, Package, ShoppingBag, Image as ImageIcon, Layers, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CatalogAudit from "@/components/catalog/CatalogAudit";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CatalogProduct {
  id: string;
  nuvemshop_product_id: string;
  name: string | null;
  category: string | null;
  status: string | null;
  image_count: number;
  variant_count: number;
  catalog_images?: { image_url: string; position: number | null }[];
}

interface VariationModelOption {
  id: string;
  nome: string;
  cores: number;
  malhas: number;
  tamanhos: number;
}

export default function Catalog() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ synced: 0, page: 0, status: "" });
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const [vmodels, setVmodels] = useState<VariationModelOption[]>([]);
  const [chosenModel, setChosenModel] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error, count } = await (supabase as any)
        .from("catalog_products")
        .select("id, nuvemshop_product_id, name, category, status, image_count, variant_count, catalog_images(image_url, position)", { count: "exact" })
        .order("name", { ascending: true })
        .limit(200);
      if (error) throw error;
      setProducts(data || []);
      setTotal(count || 0);
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openProduct = async (p: CatalogProduct) => {
    setSelected(p);
    setChosenModel(null);
    const { data } = await (supabase as any)
      .from("variation_models")
      .select("id, nome, variation_colors(count), variation_materials(count), variation_sizes(count)")
      .order("created_at", { ascending: false });
    const mapped: VariationModelOption[] = (data || []).map((m: any) => ({
      id: m.id,
      nome: m.nome,
      cores: m.variation_colors?.[0]?.count ?? 0,
      malhas: m.variation_materials?.[0]?.count ?? 0,
      tamanhos: m.variation_sizes?.[0]?.count ?? 0,
    }));
    setVmodels(mapped);
    if (mapped.length === 1) setChosenModel(mapped[0].id);
  };

  const applyVariations = async () => {
    if (!selected || !chosenModel) return;
    setApplying(true);
    try {
      const { data, error } = await supabase.functions.invoke("apply-variations", {
        body: { product_id: selected.id, model_id: chosenModel },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || "Erro ao aplicar variações");
      toast.success(`${data.created} variações aplicadas! (${data.deleted} antigas removidas)`);
      setSelected(null);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Erro ao aplicar variações");
    } finally {
      setApplying(false);
    }
  };

  const syncCatalog = async () => {
    setSyncing(true);
    setProgress({ synced: 0, page: 0, status: "Iniciando..." });
    try {
      let page = 1;
      let totalSynced = 0;
      let hasMore = true;
      while (hasMore) {
        setProgress({ synced: totalSynced, page, status: `Importando página ${page}...` });
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-catalog?page=${page}&per_page=50`,
          { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
        );
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "Erro ao sincronizar");
        }
        const result = await response.json();
        totalSynced += result.synced || 0;
        hasMore = result.has_more || false;
        page++;
        setProgress({ synced: totalSynced, page: page - 1, status: hasMore ? `${totalSynced} produtos...` : "Concluído!" });
        if (page > 100) break;
      }
      toast.success(`${totalSynced} produtos sincronizados!`);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Erro ao sincronizar catálogo");
    } finally {
      setSyncing(false);
    }
  };

  const totalVariants = products.reduce((s, p) => s + (p.variant_count || 0), 0);
  const totalImages = products.reduce((s, p) => s + (p.image_count || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Auditor de Catálogo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Catálogo importado da Nuvemshop (somente leitura)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchProducts} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button onClick={syncCatalog} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Sincronizar Catálogo
          </Button>
        </div>
      </div>

      {syncing && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress.status}</span>
              <span>Página {progress.page}</span>
            </div>
            <Progress value={progress.page > 0 ? Math.min((progress.page / 20) * 100, 95) : 0} className="h-2" />
            <p className="text-xs text-muted-foreground">{progress.synced} produtos importados</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Catálogo</TabsTrigger>
          <TabsTrigger value="analysis">Análise</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-6 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Produtos", value: total, icon: Package },
          { label: "Variações", value: totalVariants, icon: Layers },
          { label: "Imagens", value: totalImages, icon: ImageIcon },
          { label: "Categorias", value: new Set(products.map((p) => p.category).filter(Boolean)).size, icon: ShoppingBag },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Produtos importados</CardTitle>
          <CardDescription>{total} produtos no banco local</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhum produto importado. Clique em "Sincronizar Catálogo" para buscar os produtos da Nuvemshop.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => {
                const img = (p.catalog_images || []).sort((a, b) => (a.position || 0) - (b.position || 0))[0];
                return (
                  <div key={p.id} className="border border-border overflow-hidden bg-card">
                    <div className="aspect-square bg-secondary/30 flex items-center justify-center overflow-hidden">
                      {img ? (
                        <img src={img.image_url} alt={p.name || "Produto"} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <Package className="w-8 h-8 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-sm font-medium text-foreground line-clamp-2">{p.name || "Sem nome"}</p>
                      {p.category && <p className="text-xs text-muted-foreground">{p.category}</p>}
                      <div className="flex flex-wrap gap-1 pt-1">
                        <Badge variant="secondary" className="text-[10px]">{p.variant_count} var.</Badge>
                        <Badge variant="secondary" className="text-[10px]">{p.image_count} fotos</Badge>
                        {p.status && <Badge variant="outline" className="text-[10px]">{p.status}</Badge>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <CatalogAudit />
        </TabsContent>
      </Tabs>
    </div>
  );
}