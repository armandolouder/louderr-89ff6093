import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  icon: LucideIcon;
  variant?: "default" | "accent" | "warning";
}

export function StatCard({ title, value, change, icon: Icon, variant = "default" }: StatCardProps) {
  return (
    <div className="stat-card rounded-lg">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {change && (
            <p
              className={cn(
                "text-sm font-medium",
                change.type === "increase" ? "text-success" : "text-destructive"
              )}
            >
              {change.type === "increase" ? "+" : "-"}{change.value}% desde ontem
            </p>
          )}
        </div>
        <div
          className={cn(
            "p-3 rounded-lg",
            variant === "accent" && "bg-accent/20 text-accent",
            variant === "warning" && "bg-warning/20 text-warning",
            variant === "default" && "bg-primary/20 text-primary"
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
