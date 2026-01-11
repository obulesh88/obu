import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path d="M12 2L2 22H22L12 2Z" fill="hsl(var(--primary))" />
      <path d="M2 22L12 12L22 22H2Z" fill="hsl(var(--foreground))" />
    </svg>
  );
}
