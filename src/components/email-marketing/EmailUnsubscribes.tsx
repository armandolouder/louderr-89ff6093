import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ban } from "lucide-react";
import { format } from "date-fns";

export function EmailUnsubscribes() {
  const { data: unsubscribes, isLoading } = useQuery({
    queryKey: ["email-unsubscribes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_unsubscribes")
        .select("*")
        .order("unsubscribed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  if (!unsubscribes?.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Ban className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Nenhum opt-out registrado</h3>
          <p className="text-sm text-muted-foreground mt-1">Quando alguém cancelar a inscrição, aparecerá aqui.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Cancelamentos de Inscrição ({unsubscribes.length})</h2>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unsubscribes.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.email}</TableCell>
                <TableCell className="text-muted-foreground">{u.reason || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(u.unsubscribed_at), "dd/MM/yyyy HH:mm")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
