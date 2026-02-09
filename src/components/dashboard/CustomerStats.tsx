import { Users, Phone, Target } from "lucide-react";

interface CustomerStatsProps {
  totalCustomers: number;
  customersWithPhone: number;
  totalClusters: number;
}

export function CustomerStats({ totalCustomers, customersWithPhone, totalClusters }: CustomerStatsProps) {
  const phonePercentage = totalCustomers > 0 
    ? Math.round((customersWithPhone / totalCustomers) * 100) 
    : 0;

  return (
    <div className="stat-card rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-semibold text-foreground">Base de Clientes</h3>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total importados</p>
              <p className="text-xl font-bold text-foreground">
                {totalCustomers.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/20 rounded-lg">
              <Phone className="w-4 h-4 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefones válidos</p>
              <p className="text-xl font-bold text-foreground">
                {customersWithPhone.toLocaleString("pt-BR")}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({phonePercentage}%)
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/20 rounded-lg">
              <Target className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Clusters ativos</p>
              <p className="text-xl font-bold text-foreground">{totalClusters}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
