/**
 * Vertical sidebar navigation with links to all application pages.
 * Highlights the currently active route with amber styling.
 * Fixed to the left side of the screen; collapses to an icon rail below 1100px.
 */
import { Link, useLocation } from 'react-router-dom';
import type { ComponentType, SVGProps } from 'react';
import * as icons from './icons';

interface NavSection {
  heading?: string;
  links: { to: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[];
}

const sections: NavSection[] = [
  {
    links: [
      { to: '/', label: 'Home', Icon: icons.Home },
      { to: '/products', label: 'Products', Icon: icons.Products },
      { to: '/orders', label: 'Orders', Icon: icons.Orders },
      { to: '/insights', label: 'Insights', Icon: icons.Insights },
      { to: '/personal-hauls', label: 'Hauls', Icon: icons.Hauls },
    ],
  },
  {
    links: [
      { to: '/visualization/globe', label: 'Shipping Map', Icon: icons.Globe },
    ],
  },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="w-16 min-[1100px]:w-56 shrink-0 bg-white border-r border-gray-200 min-h-screen">
      <div className="px-5 py-6">
        <Link to="/" className="hidden min-[1100px]:inline text-lg font-semibold text-gray-900">
          cashflow-tracker
        </Link>
        <Link to="/" className="min-[1100px]:hidden text-lg font-semibold text-gray-900">
          ct
        </Link>
      </div>
      <nav className="flex flex-col px-3">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="flex flex-col gap-1">
            {section.heading && (
              <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {section.heading}
              </p>
            )}
            {section.links.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                title={label}
                aria-label={label}
                className={`flex items-center gap-3 justify-center min-[1100px]:justify-start px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === to
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="hidden min-[1100px]:inline">{label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
