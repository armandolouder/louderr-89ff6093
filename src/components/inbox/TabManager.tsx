import { useState, useEffect } from "react";
import { CustomTab } from "@/hooks/useCustomTabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Folder,
  Headphones,
  RefreshCcw,
  DollarSign,
  Clock,
  Star,
  Heart,
  Zap,
  ShoppingBag,
  MessageCircle,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TabManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab?: CustomTab | null;
  onSave: (data: { name: string; color: string; icon: string }) => void;
  isLoading?: boolean;
}

const AVAILABLE_ICONS = [
  { name: "Folder", icon: Folder },
  { name: "Headphones", icon: Headphones },
  { name: "RefreshCcw", icon: RefreshCcw },
  { name: "DollarSign", icon: DollarSign },
  { name: "Clock", icon: Clock },
  { name: "Star", icon: Star },
  { name: "Heart", icon: Heart },
  { name: "Zap", icon: Zap },
  { name: "ShoppingBag", icon: ShoppingBag },
  { name: "MessageCircle", icon: MessageCircle },
  { name: "Users", icon: Users },
  { name: "Settings", icon: Settings },
];

const AVAILABLE_COLORS = [
  "#6366f1", // indigo
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#64748b", // slate
];

export function TabManager({ open, onOpenChange, tab, onSave, isLoading }: TabManagerProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(AVAILABLE_COLORS[0]);
  const [icon, setIcon] = useState("Folder");

  useEffect(() => {
    if (tab) {
      setName(tab.name);
      setColor(tab.color);
      setIcon(tab.icon);
    } else {
      setName("");
      setColor(AVAILABLE_COLORS[0]);
      setIcon("Folder");
    }
  }, [tab, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), color, icon });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tab ? "Editar Aba" : "Nova Aba"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da aba</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Suporte, Vendas, Trocas..."
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    color === c ? "ring-2 ring-offset-2 ring-primary" : "hover:scale-110"
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="grid grid-cols-6 gap-2">
              {AVAILABLE_ICONS.map(({ name: iconName, icon: Icon }) => (
                <button
                  key={iconName}
                  type="button"
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                    icon === iconName
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
                  )}
                  onClick={() => setIcon(iconName)}
                >
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
