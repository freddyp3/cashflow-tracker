/**
 * Root application component. Sets up:
 * - React Router (BrowserRouter) for client-side routing
 * - Layout wrapper with the Sidebar that wraps all page routes
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import OrdersPage from './pages/OrdersPage';
import InsightsPage from './pages/InsightsPage';
import PersonalHaulsPage from './pages/PersonalHaulsPage';
import GlobePage from './pages/GlobePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/stats/products" element={<Navigate to="/insights?tab=products" replace />} />
          <Route path="/stats/platforms" element={<Navigate to="/insights?tab=platforms" replace />} />
          <Route path="/personal-hauls" element={<PersonalHaulsPage />} />
          <Route path="/visualization/globe" element={<GlobePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
