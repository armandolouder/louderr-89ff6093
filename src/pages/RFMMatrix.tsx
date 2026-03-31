import { RFMMatrix } from "@/components/customers/RFMMatrix";

export default function RFMMatrixPage() {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border bg-card/50 p-4 md:p-6">
        <h1 className="text-2xl font-bold text-foreground">Matriz RFM</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Análise de Recência, Frequência e Valor Monetário dos seus clientes
        </p>
      </div>
      <div className="flex-1 p-4 md:p-6 overflow-auto">
        <RFMMatrix />
      </div>
    </div>
  );
}
