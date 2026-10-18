/**
 * Root application component. Sets up:
 * - React Router (BrowserRouter) for client-side routing
 * - Layout wrapper with the Sidebar that wraps all page routes
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import OrdersPage from './pages/OrdersPage';
import ProductStatsPage from './pages/ProductStatsPage';
import PlatformStatsPage from './pages/PlatformStatsPage';
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
          <Route path="/stats/products" element={<ProductStatsPage />} />
          <Route path="/stats/platforms" element={<PlatformStatsPage />} />
          <Route path="/personal-hauls" element={<PersonalHaulsPage />} />
          <Route path="/visualization/globe" element={<GlobePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
