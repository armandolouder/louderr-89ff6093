import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ChannelChartProps {
  whatsappCount: number;
  instagramCount: number;
  isLoading?: boolean;
}

export function ChannelChart({ whatsappCount, instagramCount, isLoading }: ChannelChartProps) {
  if (isLoading) {
    return (
      <div className="stat-card rounded-lg h-full">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-48 w-full rounded-full mx-auto" style={{ maxWidth: 150 }} />
      </div>
    );
  }

  const total = whatsappCount + instagramCount;
  
  const data = [
    { 
      name: "WhatsApp", 
      value: whatsappCount, 
      percentage: total > 0 ? Math.round((whatsappCount / total) * 100) : 0,
      color: "hsl(var(--whatsapp))" 
    },
    { 
      name: "Instagram", 
      value: instagramCount, 
      percentage: total > 0 ? Math.round((instagramCount / total) * 100) : 0,
      color: "hsl(var(--instagram))" 
    },
  ];

  return (
    <div className="stat-card rounded-lg h-full">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Por Canal</h3>
      </div>
      
      {total > 0 ? (
        <>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, name: string) => [`${value} conversas`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {data.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {item.name} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Sem conversas no período
        </div>
      )}
    </div>
  );
}
