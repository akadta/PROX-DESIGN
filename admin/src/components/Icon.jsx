const PATHS = {
  home: <path d="M4 11.5 12 5l8 6.5M6 10v9h5v-5h2v5h5v-9" />,
  users: (
    <path d="M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM2 19c.5-3 2.8-5 6-5s5.5 2 6 5M14 19c.3-2 1.7-3.5 4-3.8" />
  ),
  chart: <path d="M5 20V10m6.5 10V4M18 20v-7" />,
  box: <path d="M3.5 8 12 3.5 20.5 8 12 12.5 3.5 8Zm0 0v8L12 20.5 20.5 16V8M12 12.5V20.5" />,
  settings: (
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM4 12h1m14 0h1M12 4v1m0 14v1M6.5 6.5l.7.7m9.6 9.6.7.7M6.5 17.5l.7-.7m9.6-9.6.7-.7" />
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  hamburger: <path d="M4 7h16M4 12h16M4 17h16" />,
  collapse: <path d="M15 6l-6 6 6 6M9 6l-6 6 6 6" />,
  bell: <path d="M6 9a6 6 0 1 1 12 0c0 3.5 1 5 2 6H4c1-1 2-2.5 2-6Zm4.5 9a1.6 1.6 0 0 0 3 0" />,
  user: <path d="M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c1-3.8 3.8-6 7-6s6 2.2 7 6" />,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,

  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M6.5 6.7C4 8.3 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.6-1.1M9.9 4.2A10.7 10.7 0 0 1 12 4c6.4 0 10 8 10 8a17 17 0 0 1-2.3 3.4" />
  ),
  edit: (
    <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3ZM14 5.5 18.5 10" />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 13l4 4L19 7" />,
  alert: (
    <path d="M12 9v4m0 4h.01M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  ),
  plus: <path d="M12 5v14M5 12h14" />,
};

export default function Icon({ name, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  );
}