import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, Sparkles, Loader2, ChevronRight, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ClusterDetailSheet } from "./ClusterDetailSheet";
import { cn } from "@/lib/utils";

interface Cluster {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  objective: string | null;
  recommendation: string | null;
  customer_count: number;
  percentage: number;
  color: string;
}

interface ClusterFormData {
  name: string;
  emoji: string;
  description: string;
  objective: string;
  recommendation: string;
  color: string;
}

const initialFormData: ClusterFormData = {
  name: "",
  emoji: "📊",
  description: "",
  objective: "",
  recommendation: "",
  color: "#6366f1",
};

const EMOJI_OPTIONS = ["📊", "🎯", "💎", "🔥", "⭐", "🚀", "💰", "👥", "🏆", "❤️", "🛒", "📱", "🎁", "🧪", "✨"];
const COLOR_OPTIONS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export function ClustersDashboard() {
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);
  const [deletingCluster, setDeletingCluster] = useState<Cluster | null>(null);
  const [formData, setFormData] = useState<ClusterFormData>(initialFormData);

  const { data: customersCount } = useQuery({
    queryKey: ["imported-customers-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("imported_customers")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: clusters, isLoading, refetch } = useQuery({
    queryKey: ["customer-clusters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_clusters")
        .select("*")
        .order("customer_count", { ascending: false });
      if (error) throw error;
      return data as Cluster[];
    },
  });

  const createClusterMutation = useMutation({
    mutationFn: async (data: ClusterFormData) => {
      const { data: cluster, error } = await supabase
        .from("customer_clusters")
        .insert({
          name: data.name,
          emoji: data.emoji || "📊",
          description: data.description || null,
          objective: data.objective || null,
          recommendation: data.recommendation || null,
          color: data.color,
          customer_count: 0,
          percentage: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return cluster;
    },
    onSuccess: () => {
      toast.success("Cluster criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["customer-clusters"] });
      handleCloseDialog();
    },
    onError: (error) => {
      console.error("Error creating cluster:", error);
      toast.error("Erro ao criar cluster");
    },
  });

  const updateClusterMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ClusterFormData }) => {
      const { error } = await supabase
        .from("customer_clusters")
        .update({
          name: data.name,
          emoji: data.emoji || "📊",
          description: data.description || null,
          objective: data.objective || null,
          recommendation: data.recommendation || null,
          color: data.color,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cluster atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["customer-clusters"] });
      handleCloseDialog();
    },
    onError: (error) => {
      console.error("Error updating cluster:", error);
      toast.error("Erro ao atualizar cluster");
    },
  });

  const deleteClusterMutation = useMutation({
    mutationFn: async (id: string) => {
      // First, remove cluster_id from all customers in this cluster
      await supabase
        .from("imported_customers")
        .update({ cluster_id: null })
        .eq("cluster_id", id);

      const { error } = await supabase
        .from("customer_clusters")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cluster removido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["customer-clusters"] });
      setDeleteDialogOpen(false);
      setDeletingCluster(null);
    },
    onError: (error) => {
      console.error("Error deleting cluster:", error);
      toast.error("Erro ao remover cluster");
    },
  });

  const pollJobStatus = async (jobId: string): Promise<boolean> => {
    const maxAttempts = 60; // 2 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between polls
      
      try {
        const { data, error } = await supabase.functions.invoke("analyze-customers", {
          body: {},
          headers: { "Content-Type": "application/json" },
        });

        // Check job status from import_batches table directly
        const { data: job } = await supabase
          .from("import_batches")
          .select("status, error_message")
          .eq("id", jobId)
          .single();

        if (job?.status === "completed") {
          return true;
        }
        if (job?.status === "failed") {
          throw new Error(job.error_message || "Análise falhou");
        }
      } catch (err) {
        console.error("Poll error:", err);
      }

      attempts++;
    }

    throw new Error("Timeout aguardando análise");
  };

  const handleAnalyze = async () => {
    if (!customersCount || customersCount === 0) {
      toast.error("Importe clientes antes de executar a análise");
      return;
    }

    setIsAnalyzing(true);
    toast.info("Iniciando análise de clientes... Isso pode levar alguns minutos.");
    
    try {
      // Start the analysis job
      const { data, error } = await supabase.functions.invoke("analyze-customers", {
        body: {},
      });

      if (error) throw error;

      if (data?.job_id) {
        // Poll for completion
        const success = await pollJobStatus(data.job_id);
        if (success) {
          toast.success("Análise concluída! Clusters gerados.");
          refetch();
        }
      } else if (data?.success) {
        // Direct success (shouldn't happen with new implementation but handle it)
        toast.success("Análise concluída! Clusters gerados.");
        refetch();
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao executar análise. Tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClusterClick = (cluster: Cluster) => {
    setSelectedCluster(cluster);
    setSheetOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingCluster(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, cluster: Cluster) => {
    e.stopPropagation();
    setEditingCluster(cluster);
    setFormData({
      name: cluster.name,
      emoji: cluster.emoji || "📊",
      description: cluster.description || "",
      objective: cluster.objective || "",
      recommendation: cluster.recommendation || "",
      color: cluster.color,
    });
    setDialogOpen(true);
  };

  const handleOpenDelete = (e: React.MouseEvent, cluster: Cluster) => {
    e.stopPropagation();
    setDeletingCluster(cluster);
    setDeleteDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCluster(null);
    setFormData(initialFormData);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (editingCluster) {
      updateClusterMutation.mutate({ id: editingCluster.id, data: formData });
    } else {
      createClusterMutation.mutate(formData);
    }
  };

  const hasData = clusters && clusters.length > 0;
  const isSubmitting = createClusterMutation.isPending || updateClusterMutation.isPending;

  // Calculate total stats
  const totalStats = clusters
    ? {
        totalCustomers: clusters.reduce((sum, c) => sum + c.customer_count, 0),
        clustersCount: clusters.length,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Segmentação de Clientes</h2>
          <p className="text-sm text-muted-foreground">
            {customersCount || 0} clientes importados
            {totalStats && totalStats.totalCustomers > 0 && (
              <> • {totalStats.totalCustomers} segmentados em {totalStats.clustersCount} clusters</>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Cluster
          </Button>
          <Button onClick={handleAnalyze} disabled={isAnalyzing || !customersCount}>
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Análise IA
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {!hasData && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum cluster criado
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Crie um cluster manualmente ou use a IA para segmentar automaticamente.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Cluster
              </Button>
              {customersCount && customersCount > 0 && (
                <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Análise IA
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clusters Grid */}
      {hasData && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clusters.map((cluster) => (
            <Card
              key={cluster.id}
              className={cn(
                "cursor-pointer transition-all duration-200",
                "hover:border-primary/50 hover:shadow-md hover:scale-[1.02]",
                "active:scale-[0.98]"
              )}
              onClick={() => handleClusterClick(cluster)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{cluster.emoji || "📊"}</span>
                    <CardTitle className="text-base">{cluster.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cluster.color }}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais ações">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => handleOpenEdit(e as any, cluster)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => handleOpenDelete(e as any, cluster)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardDescription className="line-clamp-2">
                  {cluster.description || "Sem descrição"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {cluster.customer_count}
                    </p>
                    <p className="text-xs text-muted-foreground">clientes</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-primary">
                      {cluster.percentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">do total</p>
                  </div>
                </div>
                {cluster.objective && (
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Objetivo
                    </p>
                    <p className="text-sm text-foreground line-clamp-2">{cluster.objective}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Cluster Detail Sheet */}
      <ClusterDetailSheet
        cluster={selectedCluster}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCluster ? "Editar Cluster" : "Novo Cluster"}
            </DialogTitle>
            <DialogDescription>
              {editingCluster 
                ? "Edite as informações do cluster"
                : "Crie um novo cluster para segmentar clientes manualmente"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-3">
              <div className="space-y-2">
                <Label>Emoji</Label>
                <div className="flex flex-wrap gap-1 p-2 border rounded-lg w-fit">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={cn(
                        "w-8 h-8 rounded text-lg hover:bg-muted transition-colors",
                        formData.emoji === emoji && "bg-primary/20 ring-2 ring-primary"
                      )}
                      onClick={() => setFormData({ ...formData, emoji })}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-1 p-2 border rounded-lg w-fit">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        "w-6 h-6 rounded-full transition-all",
                        formData.color === color && "ring-2 ring-offset-2 ring-primary"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Cluster *</Label>
              <Input
                id="name"
                placeholder="Ex: Clientes VIP"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva o perfil dos clientes neste cluster..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="objective">Objetivo</Label>
              <Input
                id="objective"
                placeholder="Ex: Fidelização e upsell"
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recommendation">Recomendação</Label>
              <Textarea
                id="recommendation"
                placeholder="Dicas de como abordar este segmento..."
                value={formData.recommendation}
                onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingCluster ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cluster</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cluster <strong>{deletingCluster?.name}</strong>?
              Os clientes serão desvinculados mas não serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCluster && deleteClusterMutation.mutate(deletingCluster.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteClusterMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
