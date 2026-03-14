import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      {...props}
    >
      {/* Outer Glow/Background Stylization */}
      <circle cx="50" cy="50" r="45" fill="currentColor" fillOpacity="0.05" />
      
      {/* O Character */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M42 28H18C12.4772 28 8 32.4772 8 38V62C8 67.5228 12.4772 72 18 72H42C47.5228 72 52 67.5228 52 62V38C52 32.4772 47.5228 28 42 28ZM38 58H22V42H38V58Z"
        fill="hsl(var(--primary))"
      />
      
      {/* R Character */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M58 28V72H72V54H82C88.6274 54 94 48.6274 94 42C94 35.3726 88.6274 30 82 30L58 28ZM72 44V36H82C85.3137 36 88 38.6863 88 42C88 45.3137 85.3137 48 82 48H72V44Z"
        fill="hsl(var(--primary))"
      />
      
      {/* R Leg */}
      <path
        d="M82 54L96 72H84L72 54H82Z"
        fill="hsl(var(--primary))"
      />
    </svg>
  );
}
