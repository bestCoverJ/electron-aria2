import { nativeImage } from "electron";

export function createTrayIcon() {
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill="#0d9488"/>
      <path d="M16 7v12m0 0 5-5m-5 5-5-5" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9 24h14" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
  `);

  return nativeImage.createFromDataURL(`data:image/svg+xml,${svg}`);
}
