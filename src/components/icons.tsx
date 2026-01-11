import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" className="text-primary" />
      <path d="M12 16a4 4 0 100-8 4 4 0 000 8z" fill="hsl(var(--accent))" stroke="none"/>
      <path d="M12 12h.01" className="text-accent-foreground" strokeWidth="3" />
    </svg>
  );
}
