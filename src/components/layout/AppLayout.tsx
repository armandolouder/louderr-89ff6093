import { Outlet, Navigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { MobileNavigation } from "./MobileNavigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AppLayout() {
  const isMobile = useIsMobile();
  const [session, setSession] = useState<any>(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Loading state
  if (session === undefined) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <main className="flex-1 overflow-auto pb-20">
          <Outlet />
        </main>
        <MobileNavigation />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
