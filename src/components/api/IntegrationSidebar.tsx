import { cn } from "@/lib/utils";
import { MessageSquare, Brain, Server, CreditCard, Database, CheckCircle, XCircle, ShoppingBag, Mail, Instagram } from "lucide-react";

 export type IntegrationId = "uazapi" | "evolution" | "groq" | "nuvemshop" | "brevo" | "meta" | "instagram-personal";

interface Integration {
  id: IntegrationId;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
}

interface IntegrationSidebarProps {
  activeIntegration: IntegrationId;
  onSelect: (id: IntegrationId) => void;
  integrations: Integration[];
}

export function IntegrationSidebar({ activeIntegration, onSelect, integrations }: IntegrationSidebarProps) {
  return (
    <div className="w-72 border-r border-border bg-card flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Integrações</h2>
        <p className="text-xs text-muted-foreground mt-1">Gerencie suas conexões</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {integrations.map((integration) => (
          <button
            key={integration.id}
            onClick={() => onSelect(integration.id)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
              activeIntegration === integration.id
                ? "bg-primary/10 border border-primary/20"
                : "hover:bg-secondary/50"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              activeIntegration === integration.id ? "bg-primary/20" : "bg-secondary"
            )}>
              {integration.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-foreground truncate">
                  {integration.name}
                </span>
                {integration.connected ? (
                  <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {integration.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function getIntegrationIcon(id: IntegrationId) {
  const iconClass = "w-5 h-5";
  switch (id) {
    case "uazapi":
    case "evolution":
      return <MessageSquare className={iconClass} />;
    case "groq":
      return <Brain className={iconClass} />;
    case "nuvemshop":
      return <ShoppingBag className={iconClass} />;
    case "brevo":
      return <Mail className={iconClass} />;
    case "meta":
      return <Instagram className={iconClass} />;
    case "instagram-personal":
      return <Instagram className={iconClass} />;
    default:
      return <Server className={iconClass} />;
  }
}
