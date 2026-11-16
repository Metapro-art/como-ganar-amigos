// App instalable (PWA): registra el service worker y maneja el botón
// «Instalar como app» del inicio.

import { toast } from './ui.js';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const register = () =>
    navigator.serviceWorker.register('sw.js').catch((error) => console.warn('No se pudo registrar el service worker:', error));
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function setupInstallButton(button) {
  if (!button || isStandalone()) return; // ya se abrió como app

  // Android y Chrome/Edge en computador avisan cuando el sitio se puede instalar.
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (event) => {
    deferredPrompt = event;
    button.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    button.hidden = true;
    toast('¡Listo! La app quedó instalada');
  });

  // iPhone y iPad no tienen aviso de instalación: el botón explica cómo hacerlo.
  if (isIOS()) button.hidden = false;

  button.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      button.hidden = true;
    } else if (isIOS()) {
      toast('En Safari toca Compartir y elige «Agregar a inicio»', 7000);
    }
  });
}
