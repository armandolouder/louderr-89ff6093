import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { hour: "08:00", atendimentos: 12 },
  { hour: "09:00", atendimentos: 28 },
  { hour: "10:00", atendimentos: 45 },
  { hour: "11:00", atendimentos: 38 },
  { hour: "12:00", atendimentos: 22 },
  { hour: "13:00", atendimentos: 18 },
  { hour: "14:00", atendimentos: 42 },
  { hour: "15:00", atendimentos: 55 },
  { hour: "16:00", atendimentos: 48 },
  { hour: "17:00", atendimentos: 35 },
  { hour: "18:00", atendimentos: 20 },
];

export function PerformanceChart() {
  return (
    <div className="stat-card rounded-lg h-full">
      <h3 className="text-lg font-semibold text-foreground mb-4">Atendimentos Hoje</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorAtendimentos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="hour"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Area
              type="monotone"
              dataKey="atendimentos"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorAtendimentos)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
