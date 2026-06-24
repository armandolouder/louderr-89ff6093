import { Outlet, Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AppSidebar } from "./AppSidebar";
import { MobileNavigation } from "./MobileNavigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ContentFallback = () => (
  <div className="flex items-center justify-center h-full w-full">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

export function AppLayout() {
  const isMobile = useIsMobile();
  const location = useLocation();
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
          <Suspense fallback={<ContentFallback />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
          </Suspense>
        </main>
        <MobileNavigation />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <Suspense fallback={<ContentFallback />}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
        </Suspense>
      </main>
    </div>
  );
}
