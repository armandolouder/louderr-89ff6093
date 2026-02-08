import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Loader2, Phone, Mail, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ParsedRow, ColumnMapping, ImportStats } from "../ImportWizard";

interface SummaryStepProps {
  file: File | null;
  data: ParsedRow[];
  mapping: ColumnMapping;
  onComplete: () => void;
  onBack: () => void;
}

function normalizePhone(phone: string): { normalized: string; valid: boolean } {
  const digits = phone.replace(/\D/g, "");
  
  // Brazil: needs at least 10 digits (DDD + number)
  if (digits.length < 10) return { normalized: digits, valid: false };
  
  // Add country code if missing
  let normalized = digits;
  if (!digits.startsWith("55")) {
    normalized = "55" + digits;
  }
  
  // Validate length: 55 + DDD(2) + number(8-9) = 12-13 digits
  const valid = normalized.length >= 12 && normalized.length <= 13;
  
  return { normalized, valid };
}

function validateEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function parseNumber(value: string): number {
  if (!value) return 0;
  // Handle Brazilian format (1.234,56)
  const normalized = value
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return parseFloat(normalized) || 0;
}

function parseDate(value: string): string | null {
  if (!value) return null;
  
  // Try common formats
  const formats = [
    // DD/MM/YYYY
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    // DD-MM-YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{2})-(\d{2})$/,
  ];
  
  for (const format of formats) {
    const match = value.match(format);
    if (match) {
      if (format.source.startsWith("^(\\d{4})")) {
        // YYYY-MM-DD
        return `${match[1]}-${match[2]}-${match[3]}`;
      } else {
        // DD/MM/YYYY or DD-MM-YYYY
        return `${match[3]}-${match[2]}-${match[1]}`;
      }
    }
  }
  
  // Try native parse
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split("T")[0];
  }
  
  return null;
}

function getRegion(state: string): string | null {
  const regions: Record<string, string> = {
    // Sudeste
    SP: "Sudeste", RJ: "Sudeste", MG: "Sudeste", ES: "Sudeste",
    // Sul
    PR: "Sul", SC: "Sul", RS: "Sul",
    // Nordeste
    BA: "Nordeste", PE: "Nordeste", CE: "Nordeste", MA: "Nordeste",
    PI: "Nordeste", RN: "Nordeste", PB: "Nordeste", SE: "Nordeste", AL: "Nordeste",
    // Norte
    AM: "Norte", PA: "Norte", AC: "Norte", RO: "Norte",
    RR: "Norte", AP: "Norte", TO: "Norte",
    // Centro-Oeste
    GO: "Centro-Oeste", MT: "Centro-Oeste", MS: "Centro-Oeste", DF: "Centro-Oeste",
  };
  
  const uf = state?.toUpperCase().trim();
  return regions[uf] || null;
}

export function SummaryStep({ file, data, mapping, onComplete, onBack }: SummaryStepProps) {
  const [isImporting, setIsImporting] = useState(false);

  const stats = useMemo(() => {
    let validPhones = 0;
    let invalidPhones = 0;
    let absentPhones = 0;
    let validEmails = 0;
    let invalidEmails = 0;
    let absentEmails = 0;

    data.forEach((row) => {
      // Phone validation
      const phone = mapping.phone ? row[mapping.phone] : "";
      if (!phone) {
        absentPhones++;
      } else {
        const { valid } = normalizePhone(phone);
        if (valid) validPhones++;
        else invalidPhones++;
      }

      // Email validation
      const email = mapping.email ? row[mapping.email] : "";
      if (!email) {
        absentEmails++;
      } else {
        if (validateEmail(email)) validEmails++;
        else invalidEmails++;
      }
    });

    return {
      totalRows: data.length,
      validPhones,
      invalidPhones,
      absentPhones,
      validEmails,
      invalidEmails,
      absentEmails,
    };
  }, [data, mapping]);

  const handleImport = async () => {
    setIsImporting(true);

    try {
      // Create import batch
      const { data: batch, error: batchError } = await supabase
        .from("import_batches")
        .insert([{
          filename: file?.name || "unknown.csv",
          total_rows: stats.totalRows,
          valid_phones: stats.validPhones,
          invalid_phones: stats.invalidPhones,
          absent_phones: stats.absentPhones,
          valid_emails: stats.validEmails,
          invalid_emails: stats.invalidEmails,
          absent_emails: stats.absentEmails,
          column_mapping: JSON.parse(JSON.stringify(mapping)),
          status: "processing",
        }])
        .select()
        .single();

      if (batchError) throw batchError;

      // Process and insert customers
      const customers = data.map((row) => {
        const phone = mapping.phone ? row[mapping.phone] : "";
        const { normalized: normalizedPhone, valid: phoneValid } = phone
          ? normalizePhone(phone)
          : { normalized: "", valid: false };

        const email = mapping.email ? row[mapping.email] : "";
        const emailValid = email ? validateEmail(email) : false;

        const state = mapping.state ? row[mapping.state] : "";
        const region = getRegion(state);

        return {
          name: mapping.name ? row[mapping.name] || "Sem nome" : "Sem nome",
          phone: normalizedPhone || null,
          phone_status: !phone ? "absent" : phoneValid ? "valid" : "invalid",
          email: email || null,
          email_status: !email ? "absent" : emailValid ? "valid" : "invalid",
          city: mapping.city ? row[mapping.city] || null : null,
          state: state || null,
          region,
          total_spent: mapping.total_spent ? parseNumber(row[mapping.total_spent]) : 0,
          order_count: mapping.order_count ? parseInt(row[mapping.order_count]) || 0 : 0,
          first_purchase_at: mapping.first_purchase_at
            ? parseDate(row[mapping.first_purchase_at])
            : null,
          last_purchase_at: mapping.last_purchase_at
            ? parseDate(row[mapping.last_purchase_at])
            : null,
          favorite_product: mapping.favorite_product
            ? row[mapping.favorite_product] || null
            : null,
          favorite_category: mapping.favorite_category
            ? row[mapping.favorite_category] || null
            : null,
          source: mapping.source ? row[mapping.source] || null : null,
          import_batch_id: batch.id,
        };
      });

      // Insert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < customers.length; i += batchSize) {
        const chunk = customers.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from("imported_customers")
          .insert(chunk);

        if (insertError) throw insertError;
      }

      // Update batch status
      await supabase
        .from("import_batches")
        .update({
          status: "completed",
          valid_rows: customers.length,
          completed_at: new Date().toISOString(),
        })
        .eq("id", batch.id);

      toast.success(`${customers.length} clientes importados com sucesso!`);
      onComplete();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Erro ao importar clientes");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">Resumo da Importação</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Revise os dados antes de confirmar
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* File Info */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium text-foreground mb-3">Arquivo</h4>
          <p className="text-lg font-semibold text-foreground">{file?.name}</p>
          <p className="text-sm text-muted-foreground">{stats.totalRows} linhas</p>
        </div>

        {/* Phone Stats */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            WhatsApp
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-primary">Válidos</span>
              <span className="font-medium">{stats.validPhones}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-destructive">Inválidos</span>
              <span className="font-medium">{stats.invalidPhones}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ausentes</span>
              <span className="font-medium">{stats.absentPhones}</span>
            </div>
          </div>
        </div>

        {/* Email Stats */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-primary">Válidos</span>
              <span className="font-medium">{stats.validEmails}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-destructive">Inválidos</span>
              <span className="font-medium">{stats.invalidEmails}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ausentes</span>
              <span className="font-medium">{stats.absentEmails}</span>
            </div>
          </div>
        </div>

        {/* Ready to Import */}
        <div className="p-4 bg-primary/10 rounded-lg">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Prontos para importar
          </h4>
          <p className="text-3xl font-bold text-primary">{stats.totalRows}</p>
          <p className="text-sm text-muted-foreground">clientes</p>
        </div>
      </div>

      {(stats.invalidPhones > 0 || stats.absentPhones > 0) && (
        <div className="flex items-start gap-2 p-3 bg-muted border border-border rounded-lg">
          <AlertTriangle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Atenção</p>
            <p>
              {stats.invalidPhones + stats.absentPhones} clientes não poderão receber mensagens
              WhatsApp. Você ainda pode importá-los para campanhas de email futuras.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={isImporting}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={handleImport} disabled={isImporting}>
          {isImporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirmar Importação
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
