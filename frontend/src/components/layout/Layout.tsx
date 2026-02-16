import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

/**
 * Top-level layout wrapper used by React Router.
 * Renders the Sidebar on the left and the active page route via <Outlet />.
 * Content area fills the remaining width with consistent padding.
 */
export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 px-6 py-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
