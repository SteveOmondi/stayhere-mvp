import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { OwnersPage } from "./pages/OwnersPage";
import { OwnerDetailPage } from "./pages/OwnerDetailPage";
import { PropertiesPage } from "./pages/PropertiesPage";
import { PropertyFormPage } from "./pages/PropertyFormPage";
import { ListingsPage } from "./pages/ListingsPage";
import { CreateListingFromPropertyPage } from "./pages/CreateListingFromPropertyPage";
import { CustomersPage } from "./pages/CustomersPage";
import { CustomerDetailPage } from "./pages/CustomerDetailPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AgentsCaretakersPage } from "./pages/AgentsCaretakersPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AiAgentPage } from "./pages/AiAgentPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { UserManagementPage } from "./pages/UserManagementPage";
import { ReferenceDataPage } from "./pages/ReferenceDataPage";
import { usePortal } from "./context/PortalContext";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = usePortal();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected portal */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Core operations */}
        <Route path="dashboard"            element={<DashboardPage />} />
        <Route path="owners"               element={<OwnersPage />} />
        <Route path="owners/:ownerId"      element={<OwnerDetailPage />} />
        <Route path="properties"           element={<PropertiesPage />} />
        <Route path="properties/new"       element={<PropertyFormPage />} />
        <Route path="properties/:propertyId/edit" element={<PropertyFormPage />} />
        <Route path="listings"             element={<ListingsPage />} />
        <Route path="listings/new-from-property" element={<CreateListingFromPropertyPage />} />
        <Route path="agents-caretakers"    element={<AgentsCaretakersPage />} />
        <Route path="customers"            element={<CustomersPage />} />
        <Route path="customers/:customerId" element={<CustomerDetailPage />} />

        {/* Intelligence */}
        <Route path="analytics"  element={<AnalyticsPage />} />
        <Route path="ai-agent"   element={<AiAgentPage />} />

        {/* System */}
        <Route path="users"          element={<UserManagementPage />} />
        <Route path="reference-data" element={<ReferenceDataPage />} />
        <Route path="categories"     element={<CategoriesPage />} />
        <Route path="settings"       element={<SettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
