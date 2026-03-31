import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, TrendingUp, AlertTriangle, Star, Heart, ShoppingBag, Ghost, Loader2 } from "lucide-react";

interface RFMCustomer {
  id: string;
  name: string;
  rfm_recency: number;
  rfm_frequency: number;
  rfm_monetary: number;
  rfm_score: string;
  total_spent: number;
  order_count: number;
  last_purchase_at: string | null;
}

type Segment = {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  description: string;
  icon: React.ReactNode;
};

const getSegment = (r: number, f: number, m: number): Segment => {
  const avg = (r + f + m) / 3;
  if (r >= 4 && f >= 4 && m >= 4) return { label: "Campeões", emoji: "🏆", color: "text-yellow-300", bgColor: "bg-yellow-500/20 border-yellow-500/40", description: "Compram frequentemente, gastam muito e compraram recentemente", icon: <Star className="w-4 h-4" /> };
  if (r >= 4 && f >= 3) return { label: "Clientes Fiéis", emoji: "❤️", color: "text-rose-300", bgColor: "bg-rose-500/20 border-rose-500/40", description: "Compram com frequência e recentemente", icon: <Heart className="w-4 h-4" /> };
  if (r >= 3 && f >= 3 && m >= 3) return { label: "Potencial Alto", emoji: "⭐", color: "text-blue-300", bgColor: "bg-blue-500/20 border-blue-500/40", description: "Bons em todas as métricas, podem se tornar campeões", icon: <TrendingUp className="w-4 h-4" /> };
  if (r >= 3 && m >= 4) return { label: "Alto Valor", emoji: "💎", color: "text-purple-300", bgColor: "bg-purple-500/20 border-purple-500/40", description: "Gastam muito, manter engajados", icon: <ShoppingBag className="w-4 h-4" /> };
  if (r <= 2 && f >= 3) return { label: "Em Risco", emoji: "⚠️", color: "text-orange-300", bgColor: "bg-orange-500/20 border-orange-500/40", description: "Compravam muito, mas sumiram recentemente", icon: <AlertTriangle className="w-4 h-4" /> };
  if (r <= 2 && f <= 2 && m <= 2) return { label: "Hibernando", emoji: "💤", color: "text-gray-400", bgColor: "bg-gray-500/20 border-gray-500/40", description: "Baixa atividade em todas as métricas", icon: <Ghost className="w-4 h-4" /> };
  if (r <= 2) return { label: "Perdidos", emoji: "🔴", color: "text-red-300", bgColor: "bg-red-500/20 border-red-500/40", description: "Não compram há muito tempo", icon: <AlertTriangle className="w-4 h-4" /> };
  return { label: "Promissores", emoji: "🌱", color: "text-emerald-300", bgColor: "bg-emerald-500/20 border-emerald-500/40", description: "Novos clientes com potencial", icon: <TrendingUp className="w-4 h-4" /> };
};

const CELL_COLORS: Record<string, string> = {
  "Campeões": "bg-yellow-500",
  "Clientes Fiéis": "bg-rose-500",
  "Potencial Alto": "bg-blue-500",
  "Alto Valor": "bg-purple-500",
  "Em Risco": "bg-orange-500",
  "Hibernando": "bg-gray-500",
  "Perdidos": "bg-red-500",
  "Promissores": "bg-emerald-500",
};

export function RFMMatrix() {
  const [customers, setCustomers] = useState<RFMCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from("imported_customers")
        .select("id, name, rfm_recency, rfm_frequency, rfm_monetary, rfm_score, total_spent, order_count, last_purchase_at")
        .not("rfm_score", "is", null)
        .order("total_spent", { ascending: false });
      setCustomers((data as RFMCustomer[]) || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const segmentMap = useMemo(() => {
    const map: Record<string, RFMCustomer[]> = {};
    customers.forEach((c) => {
      const seg = getSegment(c.rfm_recency, c.rfm_frequency, c.rfm_monetary);
      if (!map[seg.label]) map[seg.label] = [];
      map[seg.label].push(c);
    });
    return map;
  }, [customers]);

  // Build 5x5 matrix: rows = Recency (5→1 top to bottom), cols = Frequency (1→5 left to right)
  const matrix = useMemo(() => {
    const grid: { r: number; f: number; count: number; segment: Segment; avgMonetary: number }[][] = [];
    for (let r = 5; r >= 1; r--) {
      const row: typeof grid[0] = [];
      for (let f = 1; f <= 5; f++) {
        const matching = customers.filter((c) => c.rfm_recency === r && c.rfm_frequency === f);
        const avgM = matching.length ? matching.reduce((s, c) => s + c.rfm_monetary, 0) / matching.length : 3;
        row.push({
          r, f,
          count: matching.length,
          segment: getSegment(r, f, Math.round(avgM)),
          avgMonetary: avgM,
        });
      }
      grid.push(row);
    }
    return grid;
  }, [customers]);

  const segments = useMemo(() => {
    const unique = new Map<string, { segment: Segment; count: number; totalSpent: number }>();
    customers.forEach((c) => {
      const seg = getSegment(c.rfm_recency, c.rfm_frequency, c.rfm_monetary);
      const existing = unique.get(seg.label);
      if (existing) {
        existing.count++;
        existing.totalSpent += Number(c.total_spent || 0);
      } else {
        unique.set(seg.label, { segment: seg, count: 1, totalSpent: Number(c.total_spent || 0) });
      }
    });
    return Array.from(unique.values()).sort((a, b) => b.count - a.count);
  }, [customers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!customers.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Nenhum dado RFM disponível</h3>
          <p className="text-muted-foreground text-sm mt-1">Importe clientes com histórico de compras para gerar a matriz RFM.</p>
        </CardContent>
      </Card>
    );
  }

  const filteredCustomers = selectedSegment ? segmentMap[selectedSegment] || [] : [];

  return (
    <div className="space-y-6">
      {/* Segment cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {segments.map(({ segment, count, totalSpent }) => (
          <Card
            key={segment.label}
            className={`cursor-pointer transition-all border ${
              selectedSegment === segment.label ? segment.bgColor + " ring-2 ring-primary" : "hover:border-primary/30"
            }`}
            onClick={() => setSelectedSegment(selectedSegment === segment.label ? null : segment.label)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{segment.emoji}</span>
                <span className="text-sm font-medium text-foreground">{segment.label}</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{count}</div>
              <div className="text-xs text-muted-foreground">
                R$ {totalSpent.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Matrix heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Matriz RFM — Recência × Frequência
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Cada célula mostra quantos clientes possuem aquela combinação de Recência e Frequência. A cor indica o segmento.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-xs text-muted-foreground text-right w-24">Recência ↓ / Freq →</th>
                  {[1, 2, 3, 4, 5].map((f) => (
                    <th key={f} className="p-2 text-center text-xs font-medium text-muted-foreground w-20">
                      F={f}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, ri) => (
                  <tr key={ri}>
                    <td className="p-2 text-right text-xs font-medium text-muted-foreground">
                      R={5 - ri}
                    </td>
                    {row.map((cell, ci) => (
                      <td key={ci} className="p-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`rounded-lg p-3 text-center cursor-pointer transition-all hover:scale-105 border ${
                                cell.count > 0
                                  ? `${CELL_COLORS[cell.segment.label]}/20 border-${CELL_COLORS[cell.segment.label].replace("bg-", "")}/30`
                                  : "bg-muted/30 border-transparent"
                              }`}
                              style={{
                                opacity: cell.count > 0 ? 0.5 + (cell.count / Math.max(...customers.map(() => 1), matrix.flat().reduce((m, c) => Math.max(m, c.count), 1))) * 0.5 : 0.3,
                              }}
                              onClick={() => {
                                if (cell.count > 0) setSelectedSegment(selectedSegment === cell.segment.label ? null : cell.segment.label);
                              }}
                            >
                              <div className="text-lg font-bold text-foreground">{cell.count || "—"}</div>
                              {cell.count > 0 && (
                                <div className="text-[10px] text-muted-foreground mt-0.5">{cell.segment.emoji}</div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="font-semibold">{cell.segment.emoji} {cell.segment.label}</p>
                            <p className="text-xs">{cell.segment.description}</p>
                            <p className="text-xs mt-1">R={cell.r}, F={cell.f} — {cell.count} clientes</p>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
            {Object.entries(CELL_COLORS).map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={`w-3 h-3 rounded-sm ${color}/40`} />
                {label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Customer list for selected segment */}
      {selectedSegment && filteredCustomers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              {getSegment(filteredCustomers[0].rfm_recency, filteredCustomers[0].rfm_frequency, filteredCustomers[0].rfm_monetary).emoji}{" "}
              {selectedSegment}
              <Badge variant="secondary" className="ml-auto">{filteredCustomers.length} clientes</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center">R</TableHead>
                  <TableHead className="text-center">F</TableHead>
                  <TableHead className="text-center">M</TableHead>
                  <TableHead className="text-right">Total Gasto</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.slice(0, 20).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">{c.rfm_recency}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">{c.rfm_frequency}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">{c.rfm_monetary}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {Number(c.total_spent || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">{c.order_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredCustomers.length > 20 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                Mostrando 20 de {filteredCustomers.length} clientes
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
