import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { endAccountSession } from "@/lib/accountActions";
import { toast } from "sonner";

export function useAccountLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await endAccountSession(supabase.auth, () => queryClient.clear(), () => navigate("/auth", { replace: true }));
      toast.success("Você saiu da conta.");
    } catch {
      toast.error("Não foi possível sair. Tente novamente.");
    } finally {
      setIsLoggingOut(false);
    }
  };
  return { logout, isLoggingOut };
}