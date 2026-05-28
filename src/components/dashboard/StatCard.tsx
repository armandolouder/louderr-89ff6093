import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="stat-card rounded-lg relative overflow-hidden group"
    >
      {/* Subtle background glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <motion.p 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-3xl font-bold text-foreground"
          >
            {value}
          </motion.p>
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
        <motion.div
          whileHover={{ rotate: 15, scale: 1.1 }}
          className={cn(
            "p-3 rounded-lg transition-colors",
            variant === "accent" && "bg-accent/20 text-accent group-hover:bg-accent/30",
            variant === "warning" && "bg-warning/20 text-warning group-hover:bg-warning/30",
            variant === "default" && "bg-primary/20 text-primary group-hover:bg-primary/30"
          )}
        >
          <Icon className="w-6 h-6" />
        </motion.div>
      </div>
    </motion.div>
  );
}
