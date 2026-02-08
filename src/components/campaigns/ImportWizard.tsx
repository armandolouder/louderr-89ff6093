import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileUploadStep } from "./wizard/FileUploadStep";
import { PreviewStep } from "./wizard/PreviewStep";
import { MappingStep } from "./wizard/MappingStep";
import { SummaryStep } from "./wizard/SummaryStep";

interface ImportWizardProps {
  onComplete: () => void;
}

export type ParsedRow = Record<string, string>;

export interface ColumnMapping {
  name?: string;
  phone?: string;
  email?: string;
  total_spent?: string;
  order_count?: string;
  first_purchase_at?: string;
  last_purchase_at?: string;
  city?: string;
  state?: string;
  favorite_product?: string;
  favorite_category?: string;
  source?: string;
}

export interface ImportStats {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  validPhones: number;
  invalidPhones: number;
  absentPhones: number;
  validEmails: number;
  invalidEmails: number;
  absentEmails: number;
}

const steps = [
  { id: 1, name: "Upload", description: "Selecionar arquivo" },
  { id: 2, name: "Preview", description: "Verificar dados" },
  { id: 3, name: "Mapeamento", description: "Mapear colunas" },
  { id: 4, name: "Resumo", description: "Confirmar importação" },
];

export function ImportWizard({ onComplete }: ImportWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);

  const handleFileSelect = useCallback((selectedFile: File, data: ParsedRow[], cols: string[]) => {
    setFile(selectedFile);
    setParsedData(data);
    setColumns(cols);
    setCurrentStep(2);
  }, []);

  const handleMappingComplete = useCallback((newMapping: ColumnMapping) => {
    setMapping(newMapping);
    setCurrentStep(4);
  }, []);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(4, prev + 1));
  }, []);

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <nav aria-label="Progress">
        <ol className="flex items-center justify-between">
          {steps.map((step, stepIdx) => (
            <li key={step.id} className={cn("flex-1", stepIdx !== steps.length - 1 && "pr-8")}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    currentStep > step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep === step.id
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className={cn(
                    "text-xs font-medium",
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.name}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>
              {stepIdx !== steps.length - 1 && (
                <div
                  className={cn(
                    "hidden sm:block absolute top-5 w-full h-0.5 -translate-y-1/2",
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {currentStep === 1 && (
            <FileUploadStep onFileSelect={handleFileSelect} />
          )}
          
          {currentStep === 2 && (
            <PreviewStep 
              data={parsedData} 
              columns={columns}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 3 && (
            <MappingStep
              columns={columns}
              data={parsedData}
              onComplete={handleMappingComplete}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 4 && (
            <SummaryStep
              file={file}
              data={parsedData}
              mapping={mapping}
              onComplete={onComplete}
              onBack={handleBack}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
