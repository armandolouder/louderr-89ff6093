import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Phone, Mail, ShoppingBag, Calendar, TrendingUp, MapPin } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  phone_status: string;
  email: string | null;
  email_status: string;
  city: string | null;
  state: string | null;
  region: string | null;
  total_spent: number;
  order_count: number;
  first_purchase_at: string | null;
  last_purchase_at: string | null;
  rfm_score: string | null;
  rfm_recency: number | null;
  rfm_frequency: number | null;
  rfm_monetary: number | null;
  ticket_level: string | null;
  favorite_product: string | null;
  favorite_category: string | null;
}

interface ClusterDetailSheetProps {
  cluster: {
    id: string;
    name: string;
    emoji: string | null;
    description: string | null;
    objective: string | null;
    recommendation: string | null;
    customer_count: number;
    percentage: number;
    color: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ticketBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  high: "default",
  medium: "secondary",
  low: "outline",
};

const ticketLabels: Record<string, string> = {
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

export function ClusterDetailSheet({ cluster, open, onOpenChange }: ClusterDetailSheetProps) {
  // Query for aggregated stats of ALL customers in the cluster
  const { data: clusterStats } = useQuery({
    queryKey: ["cluster-stats", cluster?.id],
    queryFn: async () => {
      if (!cluster?.id) return null;

      // Fetch ALL customers for this cluster to calculate correct stats
      let allCustomers: Customer[] = [];
      let offset = 0;
      const pageSize = 1000;

      while (true) {
        const { data: batch, error } = await supabase
          .from("imported_customers")
          .select("total_spent, order_count, phone_status, email_status")
          .eq("cluster_id", cluster.id)
          .range(offset, offset + pageSize - 1);

        if (error) throw error;
        if (!batch || batch.length === 0) break;

        allCustomers = allCustomers.concat(batch as Customer[]);
        if (batch.length < pageSize) break;
        offset += pageSize;
      }

      const totalRevenue = allCustomers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
      const totalOrders = allCustomers.reduce((sum, c) => sum + (c.order_count || 0), 0);
      const avgTicket = allCustomers.length > 0 ? totalRevenue / allCustomers.length : 0;
      const validPhones = allCustomers.filter((c) => c.phone_status === "valid").length;
      const validEmails = allCustomers.filter((c) => c.email_status === "valid").length;

      return { totalRevenue, avgTicket, totalOrders, validPhones, validEmails };
    },
    enabled: !!cluster?.id && open,
  });

  // Query for paginated customer list (display only)
  const { data: customers, isLoading } = useQuery({
    queryKey: ["cluster-customers", cluster?.id],
    queryFn: async () => {
      if (!cluster?.id) return [];

      const { data, error } = await supabase
        .from("imported_customers")
        .select("*")
        .eq("cluster_id", cluster.id)
        .order("total_spent", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!cluster?.id && open,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return "-";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 13) {
      return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    if (digits.length === 12) {
      return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
    }
    return phone;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl lg:max-w-4xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-xl">
            <span className="text-2xl">{cluster?.emoji}</span>
            {cluster?.name}
            <Badge variant="outline" className="ml-2">
              {cluster?.customer_count} clientes
            </Badge>
          </SheetTitle>
          <SheetDescription>{cluster?.description}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
        {/* Summary Cards */}
          {clusterStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Receita Total</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(clusterStats.totalRevenue)}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Ticket Médio</p>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(clusterStats.avgTicket)}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">WhatsApp válidos</p>
                <p className="text-lg font-bold text-foreground">
                  {clusterStats.validPhones}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Emails válidos</p>
                <p className="text-lg font-bold text-foreground">
                  {clusterStats.validEmails}
                </p>
              </div>
            </div>
          )}

          {/* Objective & Recommendation */}
          {(cluster?.objective || cluster?.recommendation) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {cluster?.objective && (
                <div className="p-3 border rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Objetivo</p>
                  <p className="text-sm text-foreground">{cluster.objective}</p>
                </div>
              )}
              {cluster?.recommendation && (
                <div className="p-3 border rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Recomendação</p>
                  <p className="text-sm text-foreground">{cluster.recommendation}</p>
                </div>
              )}
            </div>
          )}

          {/* Customers Table */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">
              Clientes ({customers?.length || 0} exibidos)
            </h4>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : customers && customers.length > 0 ? (
              <ScrollArea className="h-[400px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead className="text-right">Total Gasto</TableHead>
                      <TableHead className="text-center">Pedidos</TableHead>
                      <TableHead className="text-center">RFM</TableHead>
                      <TableHead>Última Compra</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{customer.name}</p>
                            {customer.city && customer.state && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {customer.city}, {customer.state}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {customer.phone && (
                              <div className="flex items-center gap-1 text-xs">
                                <Phone className={cn(
                                  "w-3 h-3",
                                  customer.phone_status === "valid" ? "text-primary" : "text-muted-foreground"
                                )} />
                                <span className={cn(
                                  customer.phone_status === "valid" ? "text-foreground" : "text-muted-foreground"
                                )}>
                                  {formatPhone(customer.phone)}
                                </span>
                              </div>
                            )}
                            {customer.email && (
                              <div className="flex items-center gap-1 text-xs">
                                <Mail className={cn(
                                  "w-3 h-3",
                                  customer.email_status === "valid" ? "text-primary" : "text-muted-foreground"
                                )} />
                                <span className={cn(
                                  "truncate max-w-[150px]",
                                  customer.email_status === "valid" ? "text-foreground" : "text-muted-foreground"
                                )}>
                                  {customer.email}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <p className="font-medium text-foreground">
                              {formatCurrency(customer.total_spent || 0)}
                            </p>
                            {customer.ticket_level && (
                              <Badge 
                                variant={ticketBadgeVariant[customer.ticket_level] || "outline"}
                                className="text-[10px] mt-1"
                              >
                                {ticketLabels[customer.ticket_level] || customer.ticket_level}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <ShoppingBag className="w-3 h-3 text-muted-foreground" />
                            <span className="font-medium">{customer.order_count || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {customer.rfm_score ? (
                            <div className="flex flex-col items-center">
                              <span className="font-mono text-sm font-bold text-primary">
                                {customer.rfm_score}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                R{customer.rfm_recency} F{customer.rfm_frequency} M{customer.rfm_monetary}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.last_purchase_at ? (
                            <div className="flex items-center gap-1 text-xs">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span>
                                {formatDistanceToNow(new Date(customer.last_purchase_at), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum cliente neste cluster
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
