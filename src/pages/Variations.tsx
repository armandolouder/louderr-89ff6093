import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Loader2, Save, Palette, Shirt, Ruler, Pencil, X, LayoutGrid, List, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NUVEM_COLORS, colorHex, isRecognized, findNuvemColor } from "@/lib/nuvemshopColors";

interface SizeRow {
  id?: string;
  tamanho: string;
  preco: string;
  precoPromocional: string;
  ativo: boolean;
}

interface VariationModel {
  id: string;
  nome: string;
  position: number;
  colors: string[];
  materials: string[];
  sizes: { tamanho: string; preco: number | null; precoPromocional: number | null; ativo: boolean }[];
}

const DEFAULT_MATERIALS = ["Unissex", "Babylook", "Egípcia", "Oversized", "Manga Longa", "Moletom"];
const DEFAULT_SIZES: SizeRow[] = [
  { tamanho: "P", preco: "129,90", precoPromocional: "99,90", ativo: true },
  { tamanho: "M", preco: "129,90", precoPromocional: "99,90", ativo: true },
  { tamanho: "G", preco: "129,90", precoPromocional: "99,90", ativo: true },
  { tamanho: "GG", preco: "139,90", precoPromocional: "109,90", ativo: true },
  { tamanho: "XG", preco: "139,90", precoPromocional: "109,90", ativo: true },
  { tamanho: "G1", preco: "149,90", precoPromocional: "119,90", ativo: false },
  { tamanho: "G2", preco: "159,90", precoPromocional: "129,90", ativo: false },
  { tamanho: "G3", preco: "169,90", precoPromocional: "139,90", ativo: false },
];

const parsePrice = (v: string): number | null => {
  if (!v.trim()) return null;
  const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
};
const formatPrice = (n: number | null): string =>
  n == null ? "" : n.toFixed(2).replace(".", ",");

export default function Variations() {
  const [models, setModels] = useState<VariationModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"block" | "list">(
    () => (localStorage.getItem("variations_view_mode") as "block" | "list") || "block"
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("variations_view_mode", viewMode);
  }, [viewMode]);

  // form state
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [sizes, setSizes] = useState<SizeRow[]>([]);
  const [newColor, setNewColor] = useState("");
  const [newMaterial, setNewMaterial] = useState("");

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("variation_models")
        .select(
          "id, nome, position, variation_colors(nome_cor), variation_materials(nome_malha), variation_sizes(tamanho, preco, preco_promocional, ativo, position)"
        )
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setModels(
        (data || []).map((m: any) => ({
          id: m.id,
          nome: m.nome,
          position: m.position ?? 0,
          colors: (m.variation_colors || []).map((c: any) => c.nome_cor),
          materials: (m.variation_materials || []).map((c: any) => c.nome_malha),
          sizes: (m.variation_sizes || [])
            .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
            .map((s: any) => ({ tamanho: s.tamanho, preco: s.preco, precoPromocional: s.preco_promocional, ativo: s.ativo })),
        }))
      );
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar modelos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const openNew = () => {
    setEditId(null);
    setNome("");
    setColors([]);
    setMaterials([]);
    setSizes(DEFAULT_SIZES.map((s) => ({ ...s })));
    setNewColor("");
    setNewMaterial("");
    setOpen(true);
  };

  const openEdit = (m: VariationModel) => {
    setEditId(m.id);
    setNome(m.nome);
    setColors([...m.colors]);
    setMaterials([...m.materials]);
    setSizes(
      m.sizes.length
        ? m.sizes.map((s) => ({ tamanho: s.tamanho, preco: formatPrice(s.preco), precoPromocional: formatPrice(s.precoPromocional), ativo: s.ativo }))
        : DEFAULT_SIZES.map((s) => ({ ...s }))
    );
    setNewColor("");
    setNewMaterial("");
    setOpen(true);
  };

  const toggleItem = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((c) => c !== value) : [...list, value]);
  };

  const addCustom = (value: string, list: string[], setList: (v: string[]) => void, reset: () => void) => {
    const v = value.trim();
    if (!v) return;
    if (!list.includes(v)) setList([...list, v]);
    reset();
  };

  const updateSize = (idx: number, patch: Partial<SizeRow>) => {
    setSizes((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };
  const addSizeRow = () => setSizes((prev) => [...prev, { tamanho: "", preco: "", precoPromocional: "", ativo: true }]);
  const removeSizeRow = (idx: number) => setSizes((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error("Informe o nome do modelo");
      return;
    }
    setSaving(true);
    try {
      let modelId = editId;
      if (editId) {
        const { error } = await (supabase as any)
          .from("variation_models")
          .update({ nome: nome.trim() })
          .eq("id", editId);
        if (error) throw error;
        // limpa filhos para regravar
        await Promise.all([
          (supabase as any).from("variation_colors").delete().eq("variation_model_id", editId),
          (supabase as any).from("variation_materials").delete().eq("variation_model_id", editId),
          (supabase as any).from("variation_sizes").delete().eq("variation_model_id", editId),
        ]);
      } else {
        const { data, error } = await (supabase as any)
          .from("variation_models")
          .insert({ nome: nome.trim() })
          .select("id")
          .single();
        if (error) throw error;
        modelId = data.id;
      }

      const inserts: Promise<any>[] = [];
      if (colors.length) {
        inserts.push(
          (supabase as any)
            .from("variation_colors")
            .insert(colors.map((nome_cor) => ({ variation_model_id: modelId, nome_cor })))
        );
      }
      if (materials.length) {
        inserts.push(
          (supabase as any)
            .from("variation_materials")
            .insert(materials.map((nome_malha) => ({ variation_model_id: modelId, nome_malha })))
        );
      }
      const validSizes = sizes.filter((s) => s.tamanho.trim());
      if (validSizes.length) {
        inserts.push(
          (supabase as any).from("variation_sizes").insert(
            validSizes.map((s, i) => ({
              variation_model_id: modelId,
              tamanho: s.tamanho.trim(),
              preco: parsePrice(s.preco),
              preco_promocional: parsePrice(s.precoPromocional),
              ativo: s.ativo,
              position: i,
            }))
          )
        );
      }
      const results = await Promise.all(inserts);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;

      toast.success(editId ? "Modelo atualizado!" : "Modelo criado!");
      setOpen(false);
      fetchModels();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar modelo");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await (supabase as any).from("variation_models").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("Modelo excluído");
      setDeleteId(null);
      fetchModels();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir");
    }
  };

  const persistOrder = async (ordered: VariationModel[]) => {
    try {
      await Promise.all(
        ordered.map((m, i) =>
          (supabase as any).from("variation_models").update({ position: i }).eq("id", m.id)
        )
      );
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar ordem");
      fetchModels();
    }
  };

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    setModels((prev) => {
      const list = [...prev];
      const from = list.findIndex((m) => m.id === dragId);
      const to = list.findIndex((m) => m.id === targetId);
      if (from === -1 || to === -1) return prev;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      persistOrder(list);
      return list;
    });
    setDragId(null);
    setOverId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Modelos de Variações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre as opções que serão utilizadas nos produtos da Nuvemshop.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-border">
            <button
              type="button"
              onClick={() => setViewMode("block")}
              className={
                "flex items-center gap-1.5 px-3 py-2 text-xs transition-colors " +
                (viewMode === "block"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-accent")
              }
              title="Modo bloco"
            >
              <LayoutGrid className="w-4 h-4" /> Blocos
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={
                "flex items-center gap-1.5 px-3 py-2 text-xs transition-colors border-l border-border " +
                (viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-accent")
              }
              title="Modo lista"
            >
              <List className="w-4 h-4" /> Lista
            </button>
          </div>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" /> Novo Modelo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : models.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Nenhum modelo cadastrado. Clique em "Novo Modelo" para começar.
        </div>
      ) : viewMode === "block" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((m) => (
            <Card
              key={m.id}
              draggable
              onDragStart={() => setDragId(m.id)}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              onDragOver={(e) => { e.preventDefault(); setOverId(m.id); }}
              onDrop={() => handleDrop(m.id)}
              className={
                "transition-all cursor-grab active:cursor-grabbing " +
                (dragId === m.id ? "opacity-40 " : "") +
                (overId === m.id && dragId !== m.id ? "ring-2 ring-primary " : "")
              }
            >
              <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                <div className="flex items-start gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                  <div>
                    <CardTitle className="text-base uppercase">{m.nome}</CardTitle>
                    <CardDescription>
                      {m.colors.length} cores · {m.materials.length} malhas · {m.sizes.length} tamanhos
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {m.colors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Palette className="w-3 h-3" /> Cores
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {m.colors.map((c) => (
                        <Badge key={c} variant="secondary" className="text-[10px] gap-1">
                          <span
                            className="w-2.5 h-2.5 border border-border"
                            style={{ background: colorHex(c) }}
                          />
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {m.materials.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Shirt className="w-3 h-3" /> Malhas
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {m.materials.map((c) => (
                        <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {m.sizes.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Ruler className="w-3 h-3" /> Tamanhos
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {m.sizes.map((s) => (
                        <Badge
                          key={s.tamanho}
                          variant={s.ativo ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {s.tamanho} · {s.precoPromocional != null
                            ? `${formatPrice(s.precoPromocional)} (de ${formatPrice(s.preco)})`
                            : formatPrice(s.preco)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col border border-border divide-y divide-border">
          {models.map((m) => (
            <div
              key={m.id}
              draggable
              onDragStart={() => setDragId(m.id)}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              onDragOver={(e) => { e.preventDefault(); setOverId(m.id); }}
              onDrop={() => handleDrop(m.id)}
              className={
                "flex items-center gap-3 px-3 py-2.5 bg-card transition-all cursor-grab active:cursor-grabbing " +
                (dragId === m.id ? "opacity-40 " : "") +
                (overId === m.id && dragId !== m.id ? "ring-2 ring-inset ring-primary " : "hover:bg-accent/40 ")
              }
            >
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium uppercase truncate">{m.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {m.colors.length} cores · {m.materials.length} malhas · {m.sizes.length} tamanhos
                </p>
              </div>
              <div className="hidden sm:flex flex-wrap gap-1 max-w-[40%] justify-end">
                {m.colors.slice(0, 4).map((c) => (
                  <Badge key={c} variant="secondary" className="text-[10px] gap-1">
                    <span className="w-2.5 h-2.5 border border-border" style={{ background: colorHex(c) }} />
                    {c}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Modelo" : "Novo Modelo de Variação"}</DialogTitle>
            <DialogDescription>
              Defina cores, malhas e tamanhos reutilizáveis nos produtos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Camiseta Padrão"
              />
            </div>

            {/* Cores */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Palette className="w-4 h-4" /> Cores
              </Label>
              {colors.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleItem(colors, setColors, c)}
                      title={isRecognized(c) ? "Cor reconhecida pela Nuvemshop" : "Cor não reconhecida — vai aparecer cinza na loja"}
                      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs border border-primary bg-primary/10"
                    >
                      <span
                        className="w-3.5 h-3.5 border border-border"
                        style={{ background: colorHex(c) }}
                      />
                      {c}
                      {!isRecognized(c) && <span className="text-destructive">⚠</span>}
                      <X className="w-3 h-3 opacity-60" />
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Escolha cores da paleta oficial da Nuvemshop para a bolinha aparecer com o RGB correto na loja.
              </p>
              <div className="max-h-44 overflow-y-auto border border-border p-2 grid grid-cols-2 sm:grid-cols-3 gap-1">
                {NUVEM_COLORS.map((nc) => {
                  const selected = colors.some((c) => findNuvemColor(c)?.nome === nc.nome);
                  return (
                    <button
                      key={nc.nome}
                      type="button"
                      onClick={() =>
                        selected
                          ? setColors(colors.filter((c) => findNuvemColor(c)?.nome !== nc.nome))
                          : setColors([...colors, nc.nome])
                      }
                      className={
                        "inline-flex items-center gap-1.5 px-1.5 py-1 text-xs border transition-colors text-left " +
                        (selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:bg-accent")
                      }
                    >
                      <span
                        className="w-3.5 h-3.5 shrink-0 border border-border"
                        style={{ background: nc.hex }}
                      />
                      <span className="truncate">{nc.nome}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  placeholder="Cor personalizada (pode aparecer cinza na loja)"
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    (e.preventDefault(), addCustom(newColor, colors, setColors, () => setNewColor("")))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addCustom(newColor, colors, setColors, () => setNewColor(""))}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Malhas */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Shirt className="w-4 h-4" /> Malhas
              </Label>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set([...DEFAULT_MATERIALS, ...materials])).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleItem(materials, setMaterials, c)}
                    className={
                      "px-3 py-1.5 text-xs border transition-colors " +
                      (materials.includes(c)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:bg-accent")
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                  placeholder="Adicionar malha"
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    (e.preventDefault(),
                    addCustom(newMaterial, materials, setMaterials, () => setNewMaterial("")))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    addCustom(newMaterial, materials, setMaterials, () => setNewMaterial(""))
                  }
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Tamanhos */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Ruler className="w-4 h-4" /> Tamanhos (preços por tamanho)
              </Label>
              <div className="border border-border">
                <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 px-3 py-2 bg-muted text-xs font-medium text-muted-foreground">
                  <span>Tamanho</span>
                  <span>Preço de venda</span>
                  <span>Preço promocional</span>
                  <span>Ativo</span>
                  <span></span>
                </div>
                {sizes.map((s, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 px-3 py-2 items-center border-t border-border"
                  >
                    <Input
                      value={s.tamanho}
                      onChange={(e) => updateSize(idx, { tamanho: e.target.value })}
                      placeholder="P"
                      className="h-8"
                    />
                    <Input
                      value={s.preco}
                      onChange={(e) => updateSize(idx, { preco: e.target.value })}
                      placeholder="129,90"
                      className="h-8"
                    />
                    <Input
                      value={s.precoPromocional}
                      onChange={(e) => updateSize(idx, { precoPromocional: e.target.value })}
                      placeholder="99,90"
                      className="h-8"
                    />
                    <Switch checked={s.ativo} onCheckedChange={(v) => updateSize(idx, { ativo: v })} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeSizeRow(idx)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addSizeRow}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar tamanho
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. As cores, malhas e tamanhos deste modelo serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}