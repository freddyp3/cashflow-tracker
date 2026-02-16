/**
 * Root application component. Sets up:
 * - React Query (QueryClientProvider) for server-state management
 * - React Router (BrowserRouter) for client-side routing
 * - Layout wrapper with Navbar that wraps all page routes
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import OrdersPage from './pages/OrdersPage';
import ProductStatsPage from './pages/ProductStatsPage';
import PlatformStatsPage from './pages/PlatformStatsPage';
import PersonalHaulsPage from './pages/PersonalHaulsPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/stats/products" element={<ProductStatsPage />} />
            <Route path="/stats/platforms" element={<PlatformStatsPage />} />
            <Route path="/personal-hauls" element={<PersonalHaulsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
