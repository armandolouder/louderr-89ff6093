import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PeriodFilter as PeriodFilterType } from "@/hooks/useDashboardStats";

interface PeriodFilterProps {
  value: PeriodFilterType;
  onChange: (value: PeriodFilterType) => void;
}

const periods: { value: PeriodFilterType; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
];

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1">
      <CalendarDays className="w-4 h-4 text-muted-foreground ml-2" />
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
            value === period.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
