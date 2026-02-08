import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ParsedRow } from "../ImportWizard";

interface FileUploadStepProps {
  onFileSelect: (file: File, data: ParsedRow[], columns: string[]) => void;
}

export function FileUploadStep({ onFileSelect }: FileUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseCSV = (text: string): { data: ParsedRow[]; columns: string[] } => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) throw new Error("Arquivo vazio ou sem dados");
    
    // Detect delimiter
    const firstLine = lines[0];
    const delimiter = firstLine.includes(";") ? ";" : ",";
    
    const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ""));
    const data: ParsedRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ""));
      const row: ParsedRow = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || "";
      });
      data.push(row);
    }
    
    return { data, columns: headers };
  };

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      
      if (extension === "csv") {
        const text = await file.text();
        const { data, columns } = parseCSV(text);
        onFileSelect(file, data, columns);
        toast.success(`${data.length} linhas encontradas`);
      } else if (extension === "xlsx" || extension === "xls") {
        // For Excel files, we'll need a library - for now show message
        toast.error("Suporte a Excel em breve. Por favor, exporte como CSV.");
        setError("Arquivos Excel ainda não são suportados. Exporte como CSV.");
      } else {
        setError("Formato não suportado. Use CSV ou XLSX.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao processar arquivo";
      setError(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">Importar Planilha de Clientes</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Faça upload de um arquivo CSV ou XLSX com os dados dos seus clientes
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
          isProcessing && "opacity-50 pointer-events-none"
        )}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
          disabled={isProcessing}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-4">
            {isProcessing ? (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <FileSpreadsheet className="w-8 h-8 text-primary" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-foreground">
                {isProcessing ? "Processando arquivo..." : "Arraste e solte seu arquivo aqui"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ou clique para selecionar
              </p>
            </div>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-muted rounded text-xs font-medium">CSV</span>
              <span className="px-2 py-1 bg-muted rounded text-xs font-medium">XLSX</span>
            </div>
          </div>
        </label>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-2">Colunas esperadas</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" />
            nome *
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" />
            telefone *
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" />
            total_gasto *
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" />
            qtd_pedidos *
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
            email
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
            cidade
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
            estado
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
            data_ultima_compra
          </div>
        </div>
      </div>
    </div>
  );
}
