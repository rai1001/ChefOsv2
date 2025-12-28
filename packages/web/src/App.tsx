import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './presentation/pages/LoginPage';
import { Layout } from './presentation/components/Layout';
import { Dashboard } from './presentation/pages/Dashboard';
import { IngredientsPage } from './presentation/pages/IngredientsPage';
import { InventoryPage } from './presentation/pages/InventoryPage';
import { RecipesPage } from './presentation/pages/RecipesPage';
import { AnalyticsPage } from './presentation/pages/AnalyticsPage';
import { SchedulePage } from './presentation/pages/SchedulePage';
import { EventsPage } from './presentation/pages/EventsPage';
import { StaffPage } from './presentation/pages/StaffPage';
import { HACCPPage } from './presentation/pages/HACCPPage';
import { ProductionPage } from './presentation/pages/ProductionPage';
import { WastePage } from './presentation/pages/WastePage';
import { PurchasingPage } from './presentation/pages/PurchasingPage';
import { SupplierPage } from './presentation/pages/SupplierPage';
import { MenuPage } from './presentation/pages/MenuPage';
import { MenuAnalyticsPage } from './presentation/pages/MenuAnalyticsPage';
import { FichasTecnicasPage } from './presentation/pages/FichasTecnicasPage';
import { HospitalityLogisticsPage } from './presentation/pages/HospitalityLogisticsPage';
import { KitchenDisplayPage } from './presentation/pages/KitchenDisplayPage';
import { IntegrationsPage } from './presentation/pages/IntegrationsPage';
import { AIFeaturesPage } from './presentation/pages/AIFeaturesPage';
import { ProtectedRoute } from './presentation/components/auth/ProtectedRoute';

// Protected Route Component
// Note: Local ProtectedRoute removed in favor of Shared component

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="ingredients" element={<IngredientsPage />} />
            <Route path="recipes" element={<RecipesPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="haccp" element={<HACCPPage />} />
            <Route path="production" element={<ProductionPage />} />
            <Route path="waste" element={<WastePage />} />
            <Route path="purchasing" element={<PurchasingPage />} />
            <Route path="suppliers" element={<SupplierPage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="menu-engineering" element={<MenuAnalyticsPage />} />
            <Route path="fichas" element={<FichasTecnicasPage />} />
            <Route path="logistics" element={<HospitalityLogisticsPage />} />
            <Route path="kds" element={<KitchenDisplayPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="ai-features" element={<AIFeaturesPage />} />
            <Route path="" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
