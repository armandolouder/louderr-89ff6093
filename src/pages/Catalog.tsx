import { useState, useEffect, useCallback } from "react";
import { Download, Loader2, RefreshCw, Package, ShoppingBag, Image as ImageIcon, Layers, Sparkles, AlertTriangle, Check, ExternalLink, Search, ChevronLeft, ChevronRight, EyeOff, Wand2, ArrowUp, ArrowDown, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  product_url?: string | null;
}

interface VariationModelOption {
  id: string;
  nome: string;
  cores: number;
  malhas: number;
  tamanhos: number;
  malhaNames: string[];
}

interface ProductImageContent {
  id: string;
  image_url: string;
  position: number;
  alt: string;
}

interface ProductContent {
  name: string;
  description: string;
  tags: string;
  seo_title: string;
  seo_description: string;
  images: ProductImageContent[];
}

export default function Catalog() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ synced: 0, page: 0, status: "" });
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 24;
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const [vmodels, setVmodels] = useState<VariationModelOption[]>([]);
  const [chosenModels, setChosenModels] = useState<string[]>([]);
  // Filtro do seletor de modelos dentro do modal
  const [modelSearch, setModelSearch] = useState("");
  const [malhaFilter, setMalhaFilter] = useState<string | null>(null);
  // Status de aplicação por produto (continua em segundo plano mesmo com o modal fechado)
  const [applyStatus, setApplyStatus] = useState<Record<string, "applying" | "done" | "error">>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("catalog_apply_status") || "{}");
      // Mantém apenas os marcados como "done" — o tick verde fica permanente.
      const done: Record<string, "done"> = {};
      for (const [k, v] of Object.entries(saved)) if (v === "done") done[k] = "done";
      return done;
    } catch {
      return {};
    }
  });
  const [hiding, setHiding] = useState(false);
  // Conteúdo / SEO com IA (Groq)
  const [aiContent, setAiContent] = useState<ProductContent | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [savingContent, setSavingContent] = useState(false);

  // Persiste os ticks de "atualizado" para não sumirem ao sair da página.
  useEffect(() => {
    const done: Record<string, "done"> = {};
    for (const [k, v] of Object.entries(applyStatus)) if (v === "done") done[k] = "done";
    try { localStorage.setItem("catalog_apply_status", JSON.stringify(done)); } catch { /* noop */ }
  }, [applyStatus]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = (supabase as any)
        .from("catalog_products")
        .select("id, nuvemshop_product_id, name, category, status, image_count, variant_count, product_url:raw->>canonical_url, catalog_images(image_url, position)", { count: "exact" })
        .order("name", { ascending: true })
        .range(from, to);
      if (debouncedSearch.trim()) {
        query = query.ilike("name", `%${debouncedSearch.trim()}%`);
      }
      const { data, error, count } = await query;
      if (error) throw error;
      setProducts(data || []);
      setTotal(count || 0);
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Debounce da busca
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openProduct = async (p: CatalogProduct) => {
    setSelected(p);
    setChosenModels([]);
    setModelSearch("");
    setMalhaFilter(null);
    setAiContent(null);
    const { data } = await (supabase as any)
      .from("variation_models")
      .select("id, nome, variation_colors(count), variation_materials(nome_malha), variation_sizes(count)")
      .order("created_at", { ascending: false });
    const mapped: VariationModelOption[] = (data || []).map((m: any) => ({
      id: m.id,
      nome: m.nome,
      cores: m.variation_colors?.[0]?.count ?? 0,
      malhas: Array.isArray(m.variation_materials) ? m.variation_materials.length : 0,
      tamanhos: m.variation_sizes?.[0]?.count ?? 0,
      malhaNames: Array.isArray(m.variation_materials)
        ? m.variation_materials.map((x: any) => x?.nome_malha).filter(Boolean)
        : [],
    }));
    setVmodels(mapped);
    if (mapped.length === 1) setChosenModels([mapped[0].id]);
  };

  const toggleModel = (id: string) => {
    setChosenModels((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Malhas padrão para filtro rápido por chip
  const MALHA_CHIPS = ["UNISSEX", "BABYLOOK", "EGIPCIA", "OVERSIZED", "MANGA LONGA", "MOLETOM"];
  const normTxt = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const filteredModels = vmodels.filter((m) => {
    const nome = normTxt(m.nome);
    const malhasTxt = (m.malhaNames || []).map(normTxt);
    if (modelSearch.trim() && !nome.includes(normTxt(modelSearch))) return false;
    if (malhaFilter) {
      const f = normTxt(malhaFilter);
      const matchMalha = malhasTxt.some(
        (x) => x.includes(f) || f.includes(x),
      );
      if (!matchMalha && !nome.includes(f)) return false;
    }
    return true;
  });
  const toggleAllFiltered = () => {
    const ids = filteredModels.map((m) => m.id);
    const allSelected = ids.length > 0 && ids.every((id) => chosenModels.includes(id));
    if (allSelected) {
      setChosenModels((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setChosenModels((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const applyVariations = () => {
    if (!selected || chosenModels.length === 0) return;
    const product = selected;
    const modelIds = [...chosenModels];
    // Marca como em andamento e fecha o modal — o trabalho segue em segundo plano
    setApplyStatus((s) => ({ ...s, [product.id]: "applying" }));
    setSelected(null);
    toast.info(`Atualizando "${product.name}" em segundo plano...`);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("apply-variations", {
          body: { product_id: product.id, model_ids: modelIds },
        });
        if (error) throw error;
        if (data?.success === false) throw new Error(data.error || "Erro ao aplicar variações");
        setApplyStatus((s) => ({ ...s, [product.id]: "done" }));
        if (data?.product_url) {
          setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, product_url: data.product_url } : p)));
        }
        const errCount = Array.isArray(data?.errors) ? data.errors.length : 0;
        if (errCount > 0) {
          toast.warning(`"${product.name}": ${data.created} aplicadas, ${errCount} falharam. ${(data.errors || []).slice(0, 2).join(" | ")}`);
        } else {
          toast.success(`"${product.name}": ${data.created} variações aplicadas!`);
        }
        fetchProducts();
        // O check verde permanece (persistido no localStorage) mesmo ao sair da página.
      } catch (err: any) {
        setApplyStatus((s) => ({ ...s, [product.id]: "error" }));
        toast.error(`"${product.name}": ${err.message || "Erro ao aplicar variações"}`);
      }
    })();
  };

  const hideProduct = async () => {
    if (!selected) return;
    const product = selected;
    setHiding(true);
    try {
      const { data, error } = await supabase.functions.invoke("toggle-product-visibility", {
        body: { product_id: product.id, published: false },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || "Erro ao ocultar produto");
      toast.success(`"${product.name}" não será mais exibido na loja.`);
      setSelected(null);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Erro ao ocultar produto");
    } finally {
      setHiding(false);
    }
  };

  const generateContent = async () => {
    if (!selected) return;
    setGenLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-product-content", {
        body: { product_id: selected.id },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || "Erro ao gerar conteúdo");
      setAiContent(data.suggestion);
      toast.success("Sugestões geradas! Revise antes de salvar.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar conteúdo");
    } finally {
      setGenLoading(false);
    }
  };

  const moveImage = (index: number, dir: -1 | 1) => {
    setAiContent((c) => {
      if (!c) return c;
      const imgs = [...c.images];
      const j = index + dir;
      if (j < 0 || j >= imgs.length) return c;
      [imgs[index], imgs[j]] = [imgs[j], imgs[index]];
      return { ...c, images: imgs };
    });
  };

  const updateField = (field: keyof ProductContent, value: string) => {
    setAiContent((c) => (c ? { ...c, [field]: value } : c));
  };

  const updateAlt = (index: number, value: string) => {
    setAiContent((c) => {
      if (!c) return c;
      const imgs = c.images.map((im, i) => (i === index ? { ...im, alt: value } : im));
      return { ...c, images: imgs };
    });
  };

  const saveContent = async () => {
    if (!selected || !aiContent) return;
    setSavingContent(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-product-content", {
        body: {
          product_id: selected.id,
          content: {
            name: aiContent.name,
            description: aiContent.description,
            tags: aiContent.tags,
            seo_title: aiContent.seo_title,
            seo_description: aiContent.seo_description,
          },
          images: aiContent.images.map((im) => ({ id: im.id, alt: im.alt })),
        },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || "Erro ao salvar");
      const errCount = Array.isArray(data?.errors) ? data.errors.length : 0;
      if (errCount > 0) {
        toast.warning(`Salvo, mas ${errCount} imagem(ns) falharam. ${(data.errors || []).slice(0, 2).join(" | ")}`);
      } else {
        toast.success("Conteúdo salvo na Nuvemshop!");
      }
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar conteúdo");
    } finally {
      setSavingContent(false);
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
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-base">Produtos importados</CardTitle>
              <CardDescription>{total} produtos encontrados</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar camiseta por nome..."
                className="pl-9"
              />
            </div>
          </div>
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
                  <div
                    key={p.id}
                    onClick={() => openProduct(p)}
                    className="relative border border-border overflow-hidden bg-card cursor-pointer hover:border-primary transition-colors"
                  >
                    {applyStatus[p.id] && (
                      <div className="absolute top-2 right-2 z-10">
                        {applyStatus[p.id] === "applying" && (
                          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground shadow">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </span>
                        )}
                        {applyStatus[p.id] === "done" && (
                          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-green-600 text-white shadow">
                            <Check className="w-4 h-4" />
                          </span>
                        )}
                        {applyStatus[p.id] === "error" && (
                          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-destructive text-destructive-foreground shadow">
                            <AlertTriangle className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    )}
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
                      {p.product_url && (
                        <a
                          href={p.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 pt-1 text-[11px] text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Ver na loja
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Página {page + 1} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
            >
              Próxima <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <CatalogAudit />
        </TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="p-6 pb-3 shrink-0">
            <DialogTitle className="line-clamp-2">{selected?.name || "Produto"}</DialogTitle>
            {selected?.product_url && (
              <a
                href={selected.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline pt-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Ver camiseta na loja online
              </a>
            )}
          </DialogHeader>

          <Tabs defaultValue="variations" className="flex flex-col flex-1 min-h-0">
            <TabsList className="mx-6 grid grid-cols-2 shrink-0">
              <TabsTrigger value="variations">Variações</TabsTrigger>
              <TabsTrigger value="content">Conteúdo &amp; SEO</TabsTrigger>
            </TabsList>

            {/* ABA VARIAÇÕES */}
            <TabsContent value="variations" className="flex flex-col flex-1 min-h-0 mt-0">
              <div className="space-y-4 px-6 py-4 overflow-y-auto flex-1 min-h-0">
                <div className="flex items-start gap-2 border border-destructive/40 bg-destructive/10 p-3 text-xs text-foreground">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <span>
                    Ao aplicar, <strong>todas as variações atuais deste produto serão apagadas</strong> e
                    substituídas pela mescla dos modelos selecionados.
                  </span>
                </div>
                {vmodels.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum modelo cadastrado. Crie em Catálogo → Variações.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {/* Busca + chips de filtro rápido por malha */}
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        placeholder="Buscar modelo (cor ou malha)..."
                        className="pl-9"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {MALHA_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setMalhaFilter((prev) => (prev === chip ? null : chip))}
                          className={
                            "px-3 py-1 text-xs font-medium border transition-colors " +
                            (malhaFilter === chip
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:bg-accent")
                          }
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {filteredModels.length} modelo(s) · {chosenModels.length} selecionado(s)
                      </span>
                      <button
                        type="button"
                        onClick={toggleAllFiltered}
                        disabled={filteredModels.length === 0}
                        className="underline hover:text-foreground disabled:opacity-40"
                      >
                        {filteredModels.length > 0 && filteredModels.every((m) => chosenModels.includes(m.id))
                          ? "Limpar seleção"
                          : "Selecionar todos"}
                      </button>
                    </div>
                    {filteredModels.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum modelo encontrado com esse filtro.
                      </p>
                    ) : (
                    <div className="space-y-2">
                    {filteredModels.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleModel(m.id)}
                        className={
                          "w-full text-left border p-3 transition-colors flex items-center gap-3 " +
                          (chosenModels.includes(m.id)
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-accent")
                        }
                      >
                        <span
                          className={
                            "shrink-0 w-4 h-4 border flex items-center justify-center " +
                            (chosenModels.includes(m.id) ? "bg-primary border-primary" : "border-muted-foreground/40")
                          }
                        >
                          {chosenModels.includes(m.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-medium uppercase">{m.nome}</span>
                          <span className="block text-xs text-muted-foreground">
                            {m.cores} cores · {m.malhas} malhas · {m.tamanhos} tamanhos
                          </span>
                        </span>
                      </button>
                    ))}
                    </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2 p-6 pt-4 border-t border-border shrink-0">
                <Button
                  variant="outline"
                  onClick={hideProduct}
                  disabled={hiding}
                  className="sm:mr-auto text-destructive hover:text-destructive border-destructive/40"
                >
                  {hiding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <EyeOff className="w-4 h-4 mr-2" />}
                  Não exibir na loja
                </Button>
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Cancelar
                </Button>
                <Button onClick={applyVariations} disabled={chosenModels.length === 0}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Apagar e aplicar {chosenModels.length > 1 ? `(${chosenModels.length} modelos)` : "variações"}
                </Button>
              </DialogFooter>
            </TabsContent>

            {/* ABA CONTEÚDO & SEO (IA) */}
            <TabsContent value="content" className="flex flex-col flex-1 min-h-0 mt-0">
              <div className="space-y-4 px-6 py-4 overflow-y-auto flex-1 min-h-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Use a IA (Groq) para gerar conteúdo otimizado. Revise antes de salvar.
                  </p>
                  <Button size="sm" variant="secondary" onClick={generateContent} disabled={genLoading}>
                    {genLoading ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 mr-2" />}
                    Gerar com IA
                  </Button>
                </div>

                {!aiContent ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                    Clique em <strong>Gerar com IA</strong> para criar sugestões de nome, descrição, tags, SEO e textos das fotos. A URL do produto nunca será alterada.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome</Label>
                      <Input value={aiContent.name} onChange={(e) => updateField("name", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Descrição (HTML)</Label>
                      <Textarea rows={6} value={aiContent.description} onChange={(e) => updateField("description", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tags (separadas por vírgula)</Label>
                      <Input value={aiContent.tags} onChange={(e) => updateField("tags", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Título SEO ({aiContent.seo_title.length}/60)</Label>
                      <Input value={aiContent.seo_title} onChange={(e) => updateField("seo_title", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Descrição SEO ({aiContent.seo_description.length}/155)</Label>
                      <Textarea rows={2} value={aiContent.seo_description} onChange={(e) => updateField("seo_description", e.target.value)} />
                    </div>
                    <div className="border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                      URL do produto protegida: este fluxo não permite edição do handle e mantém a URL atual da Nuvemshop.
                    </div>

                    {aiContent.images.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs">Fotos — texto alternativo e ordem</Label>
                        {aiContent.images.map((img, i) => (
                          <div key={img.id} className="flex items-start gap-2 border border-border p-2">
                            <img src={img.image_url} alt="" className="w-12 h-12 object-cover shrink-0" />
                            <Input
                              value={img.alt}
                              onChange={(e) => updateAlt(i, e.target.value)}
                              placeholder="Texto alternativo da foto"
                              className="flex-1 h-9 text-xs"
                            />
                            <div className="flex flex-col gap-1 shrink-0">
                              <Button type="button" variant="outline" size="icon" className="h-4 w-7" onClick={() => moveImage(i, -1)} disabled={i === 0}>
                                <ArrowUp className="w-3 h-3" />
                              </Button>
                              <Button type="button" variant="outline" size="icon" className="h-4 w-7" onClick={() => moveImage(i, 1)} disabled={i === aiContent.images.length - 1}>
                                <ArrowDown className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2 p-6 pt-4 border-t border-border shrink-0">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Cancelar
                </Button>
                <Button onClick={saveContent} disabled={!aiContent || savingContent}>
                  {savingContent ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar na Nuvemshop
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}