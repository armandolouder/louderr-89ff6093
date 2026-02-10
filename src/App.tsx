import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Inbox from "./pages/Inbox";
import Campaigns from "./pages/Campaigns";
import Customers from "./pages/Customers";
import Settings from "./pages/Settings";
import Api from "./pages/Api";
import SalesDashboard from "./pages/SalesDashboard";
import AbandonedCheckouts from "./pages/AbandonedCheckouts";
import Automations from "./pages/Automations";
import Auth from "./pages/Auth";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/install" element={<Install />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/bot" element={<Dashboard />} />
            <Route path="/crm" element={<Dashboard />} />
            <Route path="/apis" element={<Api />} />
            <Route path="/sales" element={<SalesDashboard />} />
            <Route path="/abandoned-checkouts" element={<AbandonedCheckouts />} />
            <Route path="/automations" element={<Automations />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
