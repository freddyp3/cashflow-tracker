import { Link, useLocation } from 'react-router-dom';

/**
 * Top navigation bar with links to all application pages.
 * Highlights the currently active route with amber styling.
 */

const links = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Products' },
  { to: '/orders', label: 'Orders' },
  { to: '/stats/products', label: 'Product Stats' },
  { to: '/stats/platforms', label: 'Platform Stats' },
  { to: '/personal-hauls', label: 'Hauls' },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 flex items-center h-14 gap-8">
        <Link to="/" className="text-lg font-semibold text-gray-900">
          archivelol
        </Link>
        <div className="flex gap-1">
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
        </div>
      </div>
    </nav>
  );
}
