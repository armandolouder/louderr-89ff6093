import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const HomeDashboard = lazy(() => import("./pages/HomeDashboard"));
const Bot = lazy(() => import("./pages/Bot"));
const Inbox = lazy(() => import("./pages/Inbox"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const Customers = lazy(() => import("./pages/Customers"));
const Settings = lazy(() => import("./pages/Settings"));
const Api = lazy(() => import("./pages/Api"));
const SalesDashboard = lazy(() => import("./pages/SalesDashboard"));
const AbandonedCheckouts = lazy(() => import("./pages/AbandonedCheckouts"));
const RecoveryDashboard = lazy(() => import("./pages/RecoveryDashboard"));
const Automations = lazy(() => import("./pages/Automations"));
const RFMMatrixPage = lazy(() => import("./pages/RFMMatrix"));
const EmailMarketing = lazy(() => import("./pages/EmailMarketing"));
const Tracking = lazy(() => import("./pages/Tracking"));
const Journeys = lazy(() => import("./pages/Journeys"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/install" element={<Install />} />
            <Route element={<AppLayout />}>
              <Route path="/home" element={<HomeDashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/rfm" element={<RFMMatrixPage />} />
              <Route path="/bot" element={<Bot />} />
              <Route path="/crm" element={<Dashboard />} />
              <Route path="/apis" element={<Api />} />
              <Route path="/sales" element={<SalesDashboard />} />
              <Route path="/abandoned-checkouts" element={<AbandonedCheckouts />} />
              <Route path="/recovery" element={<RecoveryDashboard />} />
              <Route path="/automations" element={<Automations />} />
              <Route path="/email-marketing" element={<EmailMarketing />} />
              <Route path="/tracking" element={<Tracking />} />
              <Route path="/journeys" element={<Journeys />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
