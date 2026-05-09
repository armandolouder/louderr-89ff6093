import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Users,
  Settings,
  Zap,
  Route,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Megaphone,
  TrendingUp,
  ShoppingCart,
  Workflow,
  Rocket,
  Grid3X3,
  Mail,
  Eye,
  FileText,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface NavItem {
  name: string;
  href?: string;
  icon: any;
  children?: { name: string; href: string; icon: any }[];
}

const navigation: NavItem[] = [
  { name: "Resumo Geral", href: "/home", icon: LayoutDashboard },
  { name: "Atendimentos", href: "/inbox", icon: MessageSquare },
  { name: "Painel de Vendas", href: "/sales", icon: TrendingUp },
  { name: "Despesas", href: "/expenses", icon: Wallet },
  { name: "Clientes", href: "/customers", icon: Users },
  { name: "Matriz RFM", href: "/rfm", icon: Grid3X3 },
  { name: "Campanhas", href: "/campaigns", icon: Megaphone },
  { name: "Jornada do Cliente", href: "/journeys", icon: Route },
  {
    name: "Templates",
    icon: FileText,
    children: [
      { name: "WhatsApp", href: "/automations", icon: MessageSquare },
      { name: "Email Builder", href: "/email-marketing", icon: Mail },
    ],
  },
  { name: "Carrinhos", href: "/abandoned-checkouts", icon: ShoppingCart },
  { name: "Recovery Engine", href: "/recovery", icon: Rocket },
  { name: "Rastreamento", href: "/tracking", icon: Eye },
  { name: "Bot", href: "/bot", icon: Bot },
  { name: "APIs", href: "/apis", icon: Zap },
];

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const isChildActive = (children?: { href: string }[]) =>
    children?.some((c) => location.pathname === c.href) || false;

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground">OmniDesk</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          if (item.children) {
            const childActive = isChildActive(item.children);
            const isOpen = openMenus[item.name] ?? childActive;

            if (collapsed) {
              // In collapsed mode, show children as direct icons
              return item.children.map((child) => {
                const isActive = location.pathname === child.href;
                return (
                  <Link
                    key={child.href}
                    to={child.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <child.icon className="w-5 h-5 flex-shrink-0" />
                  </Link>
                );
              });
            }

            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full",
                    childActive
                      ? "text-sidebar-primary-foreground bg-sidebar-accent"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.name}</span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
                    {item.children.map((child) => {
                      const isActive = location.pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          to={child.href}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-primary-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <child.icon className="w-4 h-4 flex-shrink-0" />
                          <span>{child.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href!}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <div className="relative flex-shrink-0">
                <item.icon className="w-5 h-5" />
              </div>
              {!collapsed && <span className="flex-1">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-sidebar-border">
        <button
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full",
            "text-muted-foreground hover:text-destructive hover:bg-sidebar-accent transition-all duration-200"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
