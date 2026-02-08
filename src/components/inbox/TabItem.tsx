import { cn } from "@/lib/utils";
import { CustomTab } from "@/hooks/useCustomTabs";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
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
  LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface TabItemProps {
  tab: CustomTab;
  count: number;
  isActive: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
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
};

export function TabItem({ tab, count, isActive, onClick, onEdit, onDelete }: TabItemProps) {
  const IconComponent = ICON_MAP[tab.icon] || Folder;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group",
        isActive
          ? "bg-primary/10 text-primary"
          : "hover:bg-secondary text-muted-foreground hover:text-foreground"
      )}
      onClick={onClick}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${tab.color}20` }}
      >
        <IconComponent className="w-4 h-4" style={{ color: tab.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{tab.name}</p>
      </div>

      <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
        {count}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
