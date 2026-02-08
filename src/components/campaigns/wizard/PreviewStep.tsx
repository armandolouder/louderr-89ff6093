import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ParsedRow } from "../ImportWizard";

interface PreviewStepProps {
  data: ParsedRow[];
  columns: string[];
  onNext: () => void;
  onBack: () => void;
}

export function PreviewStep({ data, columns, onNext, onBack }: PreviewStepProps) {
  const previewData = data.slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">Preview dos Dados</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Mostrando as primeiras 20 linhas de {data.length} total
        </p>
      </div>

      <div className="border rounded-lg">
        <ScrollArea className="w-full">
          <div className="min-w-[800px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  {columns.map((col) => (
                    <TableHead key={col} className="min-w-[120px]">
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-center text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    {columns.map((col) => (
                      <TableCell key={col} className="max-w-[200px] truncate">
                        {row[col] || "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="text-sm text-muted-foreground">
          {columns.length} colunas • {data.length} linhas
        </div>
        <Button onClick={onNext}>
          Mapear Colunas
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
