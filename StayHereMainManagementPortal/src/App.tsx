import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="owners" element={<OwnersPage />} />
        <Route path="owners/:ownerId" element={<OwnerDetailPage />} />
        <Route path="properties" element={<PropertiesPage />} />
        <Route path="properties/new" element={<PropertyFormPage />} />
        <Route path="properties/:propertyId/edit" element={<PropertyFormPage />} />
        <Route path="listings" element={<ListingsPage />} />
        <Route path="listings/new-from-property" element={<CreateListingFromPropertyPage />} />
        <Route path="agents-caretakers" element={<AgentsCaretakersPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:customerId" element={<CustomerDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
