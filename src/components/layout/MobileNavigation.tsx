import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, MessageSquare, Bot, Megaphone, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Home", href: "/home", icon: LayoutDashboard },
  { name: "Chat", href: "/inbox", icon: MessageSquare },
  { name: "Clientes", href: "/customers", icon: Users },
  { name: "Campanhas", href: "/campaigns", icon: Megaphone },
  { name: "Config", href: "/settings", icon: Settings },
];

export function MobileNavigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:scale-95"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                  isActive && "bg-primary/20"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
              </div>
              <span className={cn(
                "text-[10px] font-medium mt-0.5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
