import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

export function ClustersDashboard() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  const handleAnalyze = async () => {
    if (!customersCount || customersCount === 0) {
      toast.error("Importe clientes antes de executar a análise");
      return;
    }

    setIsAnalyzing(true);
    try {
      // Call edge function to analyze and segment
      const { data, error } = await supabase.functions.invoke("analyze-customers", {
        body: {},
      });

      if (error) throw error;

      toast.success("Análise concluída! Clusters gerados.");
      refetch();
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Erro ao executar análise. A edge function será implementada em breve.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const hasData = clusters && clusters.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Segmentação de Clientes</h2>
          <p className="text-sm text-muted-foreground">
            {customersCount || 0} clientes importados
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={isAnalyzing || !customersCount}>
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Executar Análise IA
            </>
          )}
        </Button>
      </div>

      {/* Empty State */}
      {!hasData && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum cluster gerado
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              {customersCount && customersCount > 0
                ? "Clique em 'Executar Análise IA' para segmentar seus clientes automaticamente."
                : "Importe uma planilha de clientes primeiro para começar."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Clusters Grid */}
      {hasData && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clusters.map((cluster) => (
            <Card key={cluster.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{cluster.emoji || "📊"}</span>
                    <CardTitle className="text-base">{cluster.name}</CardTitle>
                  </div>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cluster.color }}
                  />
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
                    <p className="text-sm text-foreground">{cluster.objective}</p>
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
    </div>
  );
}
