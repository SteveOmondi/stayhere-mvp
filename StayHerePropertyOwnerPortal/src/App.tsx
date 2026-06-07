import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { OwnerProvider, useOwner } from "./context/OwnerContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PropertiesPage } from "./pages/PropertiesPage";
import { ListingsPage } from "./pages/ListingsPage";
import { TenantsPage } from "./pages/TenantsPage";
import { TeamPage } from "./pages/TeamPage";
import { NoticeBoardPage } from "./pages/NoticeBoardPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { SettingsPage } from "./pages/SettingsPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useOwner();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"   element={<DashboardPage />} />
        <Route path="/properties"  element={<PropertiesPage />} />
        <Route path="/listings"    element={<ListingsPage />} />
        <Route path="/tenants"     element={<TenantsPage />} />
        <Route path="/team"        element={<TeamPage />} />
        <Route path="/noticeboard" element={<NoticeBoardPage />} />
        <Route path="/onboarding"  element={<OnboardingPage />} />
        <Route path="/analytics"   element={<AnalyticsPage />} />
        <Route path="/settings"    element={<SettingsPage />} />
        <Route path="*"            element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <OwnerProvider>
        <AppRoutes />
      </OwnerProvider>
    </BrowserRouter>
  );
}
