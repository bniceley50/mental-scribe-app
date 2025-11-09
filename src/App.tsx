import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MfaEnforcementGuard } from "@/components/MfaEnforcementGuard";
import { LoggerProvider } from "@/lib/logger/LoggerProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import History from "./pages/History";
import Settings from "./pages/Settings";
import SecuritySettings from "./pages/SecuritySettings";
import SecurityMonitoring from "./pages/SecurityMonitoring";
import AuditDashboard from "./pages/AuditDashboard";
import ComplianceReports from "./pages/ComplianceReports";
import SystemHealth from "./pages/SystemHealth";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <LoggerProvider>
            <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes - all require authentication */}
            <Route path="/" element={<ProtectedRoute><MfaEnforcementGuard><Index /></MfaEnforcementGuard></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><MfaEnforcementGuard><Clients /></MfaEnforcementGuard></ProtectedRoute>} />
            <Route path="/client/:id" element={<ProtectedRoute><MfaEnforcementGuard><ClientProfile /></MfaEnforcementGuard></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><MfaEnforcementGuard><History /></MfaEnforcementGuard></ProtectedRoute>} />
            
            {/* Settings pages - MFA guard excluded to allow enrollment */}
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/settings/security" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
            
            {/* Admin/Security routes - require MFA for admins */}
            <Route path="/security/monitoring" element={<ProtectedRoute><MfaEnforcementGuard><SecurityMonitoring /></MfaEnforcementGuard></ProtectedRoute>} />
            <Route path="/security/audit" element={<ProtectedRoute><MfaEnforcementGuard><AuditDashboard /></MfaEnforcementGuard></ProtectedRoute>} />
            <Route path="/security/compliance" element={<ProtectedRoute><MfaEnforcementGuard><ComplianceReports /></MfaEnforcementGuard></ProtectedRoute>} />
            <Route path="/admin/system-health" element={<ProtectedRoute><MfaEnforcementGuard><SystemHealth /></MfaEnforcementGuard></ProtectedRoute>} />
            
            {/* 404 - Public */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </LoggerProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
