import { useState } from "react";
import { Plus, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TabItem } from "./TabItem";
import { TabManager } from "./TabManager";
import {
  useCustomTabs,
  useCreateTab,
  useUpdateTab,
  useDeleteTab,
  useTabConversationCounts,
  CustomTab,
} from "@/hooks/useCustomTabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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

interface CustomTabsSidebarProps {
  selectedTabId: string | null;
  onSelectTab: (tabId: string | null) => void;
}

export function CustomTabsSidebar({ selectedTabId, onSelectTab }: CustomTabsSidebarProps) {
  const { data: tabs = [], isLoading } = useCustomTabs();
  const { data: counts = {} } = useTabConversationCounts();
  const createTab = useCreateTab();
  const updateTab = useUpdateTab();
  const deleteTab = useDeleteTab();

  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [editingTab, setEditingTab] = useState<CustomTab | null>(null);
  const [deletingTab, setDeletingTab] = useState<CustomTab | null>(null);

  const totalConversations = Object.values(counts).reduce((a, b) => a + b, 0);
  const unassignedCount = counts["all"] || 0;

  const handleSave = async (data: { name: string; color: string; icon: string }) => {
    try {
      if (editingTab) {
        await updateTab.mutateAsync({ id: editingTab.id, ...data });
        toast.success("Aba atualizada!");
      } else {
        await createTab.mutateAsync(data);
        toast.success("Aba criada!");
      }
      setIsManagerOpen(false);
      setEditingTab(null);
    } catch (error) {
      toast.error("Erro ao salvar aba");
    }
  };

  const handleDelete = async () => {
    if (!deletingTab) return;
    try {
      await deleteTab.mutateAsync(deletingTab.id);
      toast.success("Aba excluída!");
      if (selectedTabId === deletingTab.id) {
        onSelectTab(null);
      }
    } catch (error) {
      toast.error("Erro ao excluir aba");
    } finally {
      setDeletingTab(null);
    }
  };

  const openEdit = (tab: CustomTab) => {
    setEditingTab(tab);
    setIsManagerOpen(true);
  };

  const openCreate = () => {
    setEditingTab(null);
    setIsManagerOpen(true);
  };

  return (
    <div className="w-56 xl:w-64 border-l border-border bg-card flex flex-col h-full flex-shrink-0 overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Abas</h3>
        <Button variant="ghost" size="icon" onClick={openCreate} className="h-8 w-8">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {/* All conversations tab */}
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
              selectedTabId === null
                ? "bg-primary/10 text-primary"
                : "hover:bg-secondary text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onSelectTab(null)}
          >
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Todas</p>
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {totalConversations}
            </span>
          </div>

          {/* Custom tabs */}
          {isLoading ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              Carregando...
            </div>
          ) : tabs.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">Nenhuma aba criada</p>
              <Button variant="outline" size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" />
                Criar aba
              </Button>
            </div>
          ) : (
            tabs.map((tab) => (
              <TabItem
                key={tab.id}
                tab={tab}
                count={counts[tab.id] || 0}
                isActive={selectedTabId === tab.id}
                onClick={() => onSelectTab(tab.id)}
                onEdit={() => openEdit(tab)}
                onDelete={() => setDeletingTab(tab)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <TabManager
        open={isManagerOpen}
        onOpenChange={setIsManagerOpen}
        tab={editingTab}
        onSave={handleSave}
        isLoading={createTab.isPending || updateTab.isPending}
      />

      <AlertDialog open={!!deletingTab} onOpenChange={() => setDeletingTab(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aba</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a aba "{deletingTab?.name}"? As conversas
              associadas não serão excluídas, apenas desvinculadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
