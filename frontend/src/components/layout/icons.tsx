/**
 * Inline 24x24 stroke icons for the sidebar rail. One component per route;
 * no icon library dependency.
 */
import type { SVGProps } from 'react';

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  );
}

export function Home(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9 21v-6h6v6" />
    </Icon>
  );
}

export function Products(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
      <path d="M4 7l8 4 8-4" />
      <path d="M12 11v10" />
    </Icon>
  );
}

export function Orders(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </Icon>
  );
}

export function ProductStats(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
    </Icon>
  );
}

export function PlatformStats(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M21 12a9 9 0 1 1-9-9" />
      <path d="M12 3v9h9" />
    </Icon>
  );
}

export function Hauls(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6 7h12l1 13H5L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </Icon>
  );
}

export function Globe(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a13.5 13.5 0 0 1 0 18M12 3a13.5 13.5 0 0 0 0 18" />
    </Icon>
  );
}
