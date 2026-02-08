import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Phone, Mail, ShoppingBag, Calendar, MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

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

interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
}

const initialFormData: CustomerFormData = {
  name: "",
  phone: "",
  email: "",
  city: "",
  state: "",
};

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
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  // Form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);

  // Query for aggregated stats of ALL customers in the cluster
  const { data: clusterStats } = useQuery({
    queryKey: ["cluster-stats", cluster?.id],
    queryFn: async () => {
      if (!cluster?.id) return null;

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
  const { data: customers, isLoading, refetch } = useQuery({
    queryKey: ["cluster-customers", cluster?.id],
    queryFn: async () => {
      if (!cluster?.id) return [];

      const { data, error } = await supabase
        .from("imported_customers")
        .select("*")
        .eq("cluster_id", cluster.id)
        .order("name", { ascending: true })
        .limit(100);

      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!cluster?.id && open,
  });

  // Mutations
  const validatePhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  };

  const validateEmail = (email: string): boolean => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const formatPhoneForStorage = (phone: string): string => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11 && !digits.startsWith("55")) {
      return "55" + digits;
    }
    if (digits.length === 10 && !digits.startsWith("55")) {
      return "55" + digits;
    }
    return digits;
  };

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      if (!cluster?.id) throw new Error("No cluster selected");
      
      const formattedPhone = formatPhoneForStorage(data.phone);
      
      const { data: customer, error } = await supabase
        .from("imported_customers")
        .insert({
          name: data.name,
          phone: formattedPhone,
          phone_status: "valid",
          email: data.email || null,
          email_status: data.email ? "valid" : "pending",
          city: data.city || null,
          state: data.state || null,
          cluster_id: cluster.id,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("customer_clusters")
        .update({ customer_count: (customers?.length || 0) + 1 })
        .eq("id", cluster.id);

      return customer;
    },
    onSuccess: () => {
      toast.success("Cliente adicionado com sucesso!");
      invalidateQueries();
      handleCloseDialog();
    },
    onError: (error) => {
      console.error("Error creating customer:", error);
      toast.error("Erro ao adicionar cliente");
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CustomerFormData }) => {
      const formattedPhone = formatPhoneForStorage(data.phone);
      
      const { error } = await supabase
        .from("imported_customers")
        .update({
          name: data.name,
          phone: formattedPhone,
          phone_status: "valid",
          email: data.email || null,
          email_status: data.email ? "valid" : "pending",
          city: data.city || null,
          state: data.state || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente atualizado com sucesso!");
      invalidateQueries();
      handleCloseDialog();
    },
    onError: (error) => {
      console.error("Error updating customer:", error);
      toast.error("Erro ao atualizar cliente");
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!cluster?.id) throw new Error("No cluster selected");
      
      const { error } = await supabase
        .from("imported_customers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await supabase
        .from("customer_clusters")
        .update({ customer_count: Math.max(0, (customers?.length || 1) - 1) })
        .eq("id", cluster.id);
    },
    onSuccess: () => {
      toast.success("Cliente removido com sucesso!");
      invalidateQueries();
      setDeleteDialogOpen(false);
      setDeletingCustomer(null);
    },
    onError: (error) => {
      console.error("Error deleting customer:", error);
      toast.error("Erro ao remover cliente");
    },
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["cluster-customers", cluster?.id] });
    queryClient.invalidateQueries({ queryKey: ["cluster-stats", cluster?.id] });
    queryClient.invalidateQueries({ queryKey: ["customer-clusters"] });
  };

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      city: customer.city || "",
      state: customer.state || "",
    });
    setDialogOpen(true);
  };

  const handleOpenDelete = (customer: Customer) => {
    setDeletingCustomer(customer);
    setDeleteDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCustomer(null);
    setFormData(initialFormData);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("Telefone é obrigatório");
      return;
    }
    if (!validatePhone(formData.phone)) {
      toast.error("Telefone inválido");
      return;
    }
    if (!validateEmail(formData.email)) {
      toast.error("Email inválido");
      return;
    }

    if (editingCustomer) {
      updateCustomerMutation.mutate({ id: editingCustomer.id, data: formData });
    } else {
      createCustomerMutation.mutate(formData);
    }
  };

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

  const isSubmitting = createCustomerMutation.isPending || updateCustomerMutation.isPending;

  // Delete confirmation - Drawer on mobile, AlertDialog on desktop
  const DeleteConfirmation = isMobile ? (
    <Drawer open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Remover cliente</DrawerTitle>
          <DrawerDescription>
            Tem certeza que deseja remover <strong>{deletingCustomer?.name}</strong>?
            Esta ação não pode ser desfeita.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button
            variant="destructive"
            onClick={() => deletingCustomer && deleteCustomerMutation.mutate(deletingCustomer.id)}
            disabled={deleteCustomerMutation.isPending}
          >
            {deleteCustomerMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Remover
          </Button>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ) : (
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover cliente</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover <strong>{deletingCustomer?.name}</strong>?
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deletingCustomer && deleteCustomerMutation.mutate(deletingCustomer.id)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteCustomerMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <>
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

            {/* Customers Table Header */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">
                Clientes ({customers?.length || 0} exibidos)
              </h4>
              <Button size="sm" onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {/* Customers Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : customers && customers.length > 0 ? (
              <ScrollArea className="h-[350px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead className="text-right">Total Gasto</TableHead>
                      <TableHead className="text-center">Pedidos</TableHead>
                      <TableHead className="text-center">RFM</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
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
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenEdit(customer)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleOpenDelete(customer)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="text-center py-12 border rounded-lg">
                <p className="text-muted-foreground mb-4">Nenhum cliente neste cluster</p>
                <Button onClick={handleOpenCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Cliente
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Editar Cliente" : "Adicionar Cliente"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer 
                ? `Editando cliente no cluster "${cluster?.name}"`
                : `Adicionar novo cliente ao cluster "${cluster?.name}"`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Nome do cliente"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (WhatsApp) *</Label>
              <Input
                id="phone"
                placeholder="Ex: 11999990001"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Apenas números. O código do país (55) será adicionado automaticamente.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  placeholder="Ex: São Paulo"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  placeholder="Ex: SP"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase().slice(0, 2) })}
                  maxLength={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingCustomer ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {DeleteConfirmation}
    </>
  );
}
