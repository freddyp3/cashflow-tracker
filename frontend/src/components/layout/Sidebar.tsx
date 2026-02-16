/**
 * Vertical sidebar navigation with links to all application pages.
 * Highlights the currently active route with amber styling.
 * Fixed to the left side of the screen.
 */
import { Link, useLocation } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Products' },
  { to: '/orders', label: 'Orders' },
  { to: '/stats/products', label: 'Product Stats' },
  { to: '/stats/platforms', label: 'Platform Stats' },
  { to: '/personal-hauls', label: 'Hauls' },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 min-h-screen">
      <div className="px-5 py-6">
        <Link to="/" className="text-lg font-semibold text-gray-900">
          archivelol
        </Link>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname === link.to
                ? 'bg-amber-50 text-amber-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
