import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedRow, ColumnMapping } from "../ImportWizard";

interface MappingStepProps {
  columns: string[];
  data: ParsedRow[];
  onComplete: (mapping: ColumnMapping) => void;
  onBack: () => void;
}

interface FieldConfig {
  key: keyof ColumnMapping;
  label: string;
  required: boolean;
  aliases: string[];
}

const fieldConfigs: FieldConfig[] = [
  { key: "name", label: "Nome", required: true, aliases: ["nome", "name", "cliente", "customer", "razao", "razao_social"] },
  { key: "phone", label: "Telefone/WhatsApp", required: true, aliases: ["telefone", "phone", "whatsapp", "celular", "cel", "mobile", "fone"] },
  { key: "email", label: "Email", required: false, aliases: ["email", "e-mail", "e_mail", "mail"] },
  { key: "total_spent", label: "Total Gasto (R$)", required: true, aliases: ["total_gasto", "total_spent", "valor", "valor_total", "lifetime_value", "receita", "revenue", "total"] },
  { key: "order_count", label: "Qtd Pedidos", required: true, aliases: ["qtd_pedidos", "order_count", "pedidos", "orders", "quantidade", "num_pedidos"] },
  { key: "first_purchase_at", label: "Data Primeira Compra", required: false, aliases: ["data_primeira_compra", "first_purchase", "primeira_compra", "first_order"] },
  { key: "last_purchase_at", label: "Data Última Compra", required: false, aliases: ["data_ultima_compra", "last_purchase", "ultima_compra", "last_order", "last_purchase_at"] },
  { key: "city", label: "Cidade", required: false, aliases: ["cidade", "city", "municipio"] },
  { key: "state", label: "Estado", required: false, aliases: ["estado", "state", "uf"] },
  { key: "favorite_product", label: "Produto Favorito", required: false, aliases: ["produto_mais_comprado", "favorite_product", "produto_favorito", "produto"] },
  { key: "favorite_category", label: "Categoria Favorita", required: false, aliases: ["categoria_preferida", "favorite_category", "categoria"] },
  { key: "source", label: "Origem", required: false, aliases: ["origem", "source", "canal", "channel"] },
];

function autoMap(columns: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const lowerColumns = columns.map(c => c.toLowerCase().trim());
  
  fieldConfigs.forEach(field => {
    const matchIndex = lowerColumns.findIndex(col => 
      field.aliases.some(alias => col === alias || col.includes(alias))
    );
    if (matchIndex !== -1) {
      mapping[field.key] = columns[matchIndex];
    }
  });
  
  return mapping;
}

export function MappingStep({ columns, data, onComplete, onBack }: MappingStepProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(() => autoMap(columns));

  const updateMapping = (field: keyof ColumnMapping, value: string) => {
    setMapping(prev => ({
      ...prev,
      [field]: value === "none" ? undefined : value
    }));
  };

  const requiredFields = fieldConfigs.filter(f => f.required);
  const optionalFields = fieldConfigs.filter(f => !f.required);
  
  const missingRequired = requiredFields.filter(f => !mapping[f.key]);
  const isValid = missingRequired.length === 0;

  const getExampleValue = (column?: string) => {
    if (!column) return "-";
    const firstRow = data[0];
    return firstRow?.[column] || "-";
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">Mapeamento de Colunas</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Associe as colunas da sua planilha aos campos do sistema
        </p>
      </div>

      {/* Required Fields */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Campos Obrigatórios
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          {requiredFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label className="flex items-center gap-2">
                {field.label}
                {mapping[field.key] ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive" />
                )}
              </Label>
              <Select
                value={mapping[field.key] || "none"}
                onValueChange={(value) => updateMapping(field.key, value)}
              >
                <SelectTrigger className={cn(!mapping[field.key] && "border-destructive")}>
                  <SelectValue placeholder="Selecione uma coluna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não mapear</SelectItem>
                  {columns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mapping[field.key] && (
                <p className="text-xs text-muted-foreground">
                  Ex: {getExampleValue(mapping[field.key])}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Optional Fields */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-muted-foreground" />
          Campos Opcionais
        </h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {optionalFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label>{field.label}</Label>
              <Select
                value={mapping[field.key] || "none"}
                onValueChange={(value) => updateMapping(field.key, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma coluna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não mapear</SelectItem>
                  {columns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mapping[field.key] && (
                <p className="text-xs text-muted-foreground truncate">
                  Ex: {getExampleValue(mapping[field.key])}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {!isValid && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">
            Campos obrigatórios não mapeados: {missingRequired.map(f => f.label).join(", ")}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={() => onComplete(mapping)} disabled={!isValid}>
          Continuar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
