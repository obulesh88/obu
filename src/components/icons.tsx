import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      {...props}
    >
      {/* Unified Frame */}
      <rect
        x="5"
        y="5"
        width="90"
        height="90"
        rx="24"
        fill="currentColor"
        fillOpacity="0.08"
      />
      
      {/* Combined OR Logo Mark */}
      <g fill="hsl(var(--primary))">
        {/* Stylized O - Outer Ring */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M45 25C31.1929 25 20 36.1929 20 50C20 63.8071 31.1929 75 45 75C58.8071 75 70 63.8071 70 50C70 36.1929 58.8071 25 45 25ZM32 50C32 42.8203 37.8203 37 45 37C52.1797 37 58 42.8203 58 50C58 57.1797 52.1797 63 45 63C37.8203 63 32 57.1797 32 50Z"
        />
        
        {/* Stylized R - Integrated with the O */}
        <path
          d="M62 42V75H74V58H82L90 75H103L93 54C97.5 51 100 47 100 41C100 32 93 25 82 25H62V42ZM74 37H82C85.5 37 88 39.5 88 43C88 46.5 85.5 49 82 49H74V37Z"
          transform="translate(-5, 0)"
        />
      </g>
    </svg>
  );
}
