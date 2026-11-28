type CertumLogoProps = {
  size?: number;
};

export function CertumLogo({ size = 34 }: CertumLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="16" fill="#1B3B8B" />
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="13"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="1.5"
      />
      <path
        d="M41.5 21.2C38.7 18.6 35 17 31 17C22.2 17 15 23.7 15 32C15 40.3 22.2 47 31 47C35 47 38.7 45.4 41.5 42.8"
        stroke="#FFFFFF"
        strokeWidth="7.2"
        strokeLinecap="round"
      />
      <circle cx="45" cy="32" r="8.5" fill="#F5B731" />
      <path
        d="M41.4 32.1L43.8 34.5L48.8 29.5"
        stroke="#10141D"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
