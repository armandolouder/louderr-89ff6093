import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, Trash2, Pencil, Plus } from "lucide-react";
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
}

interface CustomerManagerProps {
  clusterId: string;
  clusterName: string;
  customers: Customer[];
  onCustomersChange: () => void;
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

export function CustomerManager({ clusterId, clusterName, customers, onCustomersChange }: CustomerManagerProps) {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);

  const validatePhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  };

  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Email is optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const formatPhoneForStorage = (phone: string): string => {
    const digits = phone.replace(/\D/g, "");
    // Add Brazil country code if not present
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
          cluster_id: clusterId,
        })
        .select()
        .single();

      if (error) throw error;

      // Update cluster customer count
      await supabase
        .from("customer_clusters")
        .update({ customer_count: customers.length + 1 })
        .eq("id", clusterId);

      return customer;
    },
    onSuccess: () => {
      toast.success("Cliente adicionado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["cluster-customers", clusterId] });
      queryClient.invalidateQueries({ queryKey: ["cluster-stats", clusterId] });
      queryClient.invalidateQueries({ queryKey: ["customer-clusters"] });
      onCustomersChange();
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
      queryClient.invalidateQueries({ queryKey: ["cluster-customers", clusterId] });
      queryClient.invalidateQueries({ queryKey: ["cluster-stats", clusterId] });
      onCustomersChange();
      handleCloseDialog();
    },
    onError: (error) => {
      console.error("Error updating customer:", error);
      toast.error("Erro ao atualizar cliente");
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("imported_customers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Update cluster customer count
      await supabase
        .from("customer_clusters")
        .update({ customer_count: Math.max(0, customers.length - 1) })
        .eq("id", clusterId);
    },
    onSuccess: () => {
      toast.success("Cliente removido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["cluster-customers", clusterId] });
      queryClient.invalidateQueries({ queryKey: ["cluster-stats", clusterId] });
      queryClient.invalidateQueries({ queryKey: ["customer-clusters"] });
      onCustomersChange();
      setDeleteDialogOpen(false);
      setDeletingCustomer(null);
    },
    onError: (error) => {
      console.error("Error deleting customer:", error);
      toast.error("Erro ao remover cliente");
    },
  });

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

  const isSubmitting = createCustomerMutation.isPending || updateCustomerMutation.isPending;

  const FormContent = (
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
  );

  // Delete confirmation - use Drawer on mobile, AlertDialog on desktop
  const DeleteConfirmation = isMobile ? (
    <Drawer open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Remover cliente</DrawerTitle>
          <DrawerDescription>
            Tem certeza que deseja remover <strong>{deletingCustomer?.name}</strong> do cluster?
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
            Tem certeza que deseja remover <strong>{deletingCustomer?.name}</strong> do cluster?
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deletingCustomer && deleteCustomerMutation.mutate(deletingCustomer.id)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteCustomerMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <>
      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Editar Cliente" : "Adicionar Cliente"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer 
                ? `Editando cliente no cluster "${clusterName}"`
                : `Adicionar novo cliente ao cluster "${clusterName}"`}
            </DialogDescription>
          </DialogHeader>
          {FormContent}
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingCustomer ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {DeleteConfirmation}

      {/* Export functions for external use */}
    </>
  );
}

// Hook to expose customer actions
export function useCustomerActions() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return {
    dialogOpen,
    setDialogOpen,
    editingCustomer,
    setEditingCustomer,
    deletingCustomer,
    setDeletingCustomer,
    deleteDialogOpen,
    setDeleteDialogOpen,
    openCreate: () => {
      setEditingCustomer(null);
      setDialogOpen(true);
    },
    openEdit: (customer: Customer) => {
      setEditingCustomer(customer);
      setDialogOpen(true);
    },
    openDelete: (customer: Customer) => {
      setDeletingCustomer(customer);
      setDeleteDialogOpen(true);
    },
  };
}
