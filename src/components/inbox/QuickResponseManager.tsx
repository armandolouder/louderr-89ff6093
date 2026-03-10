import { useState } from "react";
import { Plus, Edit, Trash2, Image, Link, X, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useQuickResponses, 
  useCreateQuickResponse, 
  useUpdateQuickResponse, 
  useDeleteQuickResponse,
  QuickResponse 
} from "@/hooks/useQuickResponses";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuickResponseManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormData = {
  title: string;
  content: string;
  media_url: string;
  media_type: "image" | "gif" | "video" | "document" | null;
  shortcut: string;
  category: string;
  is_active: boolean;
};

const initialFormData: FormData = {
  title: "",
  content: "",
  media_url: "",
  media_type: null,
  shortcut: "",
  category: "",
  is_active: true,
};

export function QuickResponseManager({ open, onOpenChange }: QuickResponseManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [showForm, setShowForm] = useState(false);

  const { data: responses, isLoading } = useQuickResponses();
  const createResponse = useCreateQuickResponse();
  const updateResponse = useUpdateQuickResponse();
  const deleteResponse = useDeleteQuickResponse();

  const handleEdit = (response: QuickResponse) => {
    setEditingId(response.id);
    setFormData({
      title: response.title,
      content: response.content,
      media_url: response.media_url || "",
      media_type: response.media_type,
      shortcut: response.shortcut || "",
      category: response.category || "",
      is_active: response.is_active,
    });
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Título e conteúdo são obrigatórios");
      return;
    }

    try {
      const data = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        media_url: formData.media_url.trim() || null,
        media_type: formData.media_url.trim() ? formData.media_type : null,
        shortcut: formData.shortcut.trim() || null,
        category: formData.category.trim() || null,
        is_active: formData.is_active,
      };

      if (editingId) {
        await updateResponse.mutateAsync({ id: editingId, ...data });
        toast.success("Resposta atualizada!");
      } else {
        await createResponse.mutateAsync(data);
        toast.success("Resposta criada!");
      }

      handleCancel();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar resposta");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteResponse.mutateAsync(id);
      toast.success("Resposta excluída!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir resposta");
    }
  };

  const isPending = createResponse.isPending || updateResponse.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciar Respostas Rápidas</DialogTitle>
        </DialogHeader>

        {showForm ? (
          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Saudação inicial"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="content">Conteúdo *</Label>
                <Textarea
                  id="content"
                  placeholder="Digite o texto da resposta... Suporta formatação: *negrito*, _itálico_, ~riscado~"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="shortcut">Atalho (opcional)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">/</span>
                    <Input
                      id="shortcut"
                      placeholder="ola"
                      value={formData.shortcut}
                      onChange={(e) => setFormData({ ...formData, shortcut: e.target.value.replace(/\s/g, "") })}
                      className="pl-6"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="category">Categoria (opcional)</Label>
                  <Input
                    id="category"
                    placeholder="Ex: Vendas, Suporte"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Mídia (opcional)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="URL da imagem, GIF ou arquivo"
                    value={formData.media_url}
                    onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                    className="flex-1"
                  />
                  <Select
                    value={formData.media_type || "none"}
                    onValueChange={(value) => 
                      setFormData({ 
                        ...formData, 
                        media_type: value === "none" ? null : value as FormData["media_type"]
                      })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      <SelectItem value="image">Imagem</SelectItem>
                      <SelectItem value="gif">GIF</SelectItem>
                      <SelectItem value="video">Vídeo</SelectItem>
                      <SelectItem value="document">Documento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.media_url && formData.media_type === "image" && (
                  <div className="mt-2">
                    <img 
                      src={formData.media_url} 
                      alt="Preview" 
                      className="max-h-32 rounded object-contain"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isPending}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <Button onClick={handleNew} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Nova Resposta
              </Button>
            </div>

            <ScrollArea className="flex-1 -mx-6 px-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : responses?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <p className="text-muted-foreground">Nenhuma resposta cadastrada</p>
                  <Button variant="link" onClick={handleNew} className="mt-2">
                    Criar primeira resposta
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {responses?.map((response) => (
                    <div
                      key={response.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{response.title}</span>
                          {response.shortcut && (
                            <span className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-mono">
                              /{response.shortcut}
                            </span>
                          )}
                          {response.media_type && (
                            <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                              {response.media_type}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {response.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Usado {response.use_count}x
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleEdit(response)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(response.id)}
                          disabled={deleteResponse.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
