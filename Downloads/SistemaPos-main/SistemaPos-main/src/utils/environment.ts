// utils/environment.ts
export function isElectron(): boolean {
  // Detecta si está en Electron
  return !!(window && window.process && window.process.type);
}

export function isMobileBrowser(): boolean {
  // Detección simple de móvil
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

export function isWeb(): boolean {
  return !isElectron();
}
