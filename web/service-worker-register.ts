export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      '/service-worker.js',
      { scope: '/' }
    );

    console.log('✓ Service Worker registered:', registration.scope);

    // Handle service worker updates
    let refreshing = false;

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available, notify user
          if (!refreshing) {
            refreshing = true;
            window.dispatchEvent(
              new CustomEvent('sw-update-available', {
                detail: { registration },
              })
            );
          }
        }
      });
    });

    // Listen for controller change (indicates SW was updated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

export function skipWaiting(registration: ServiceWorkerRegistration) {
  const worker = registration.waiting;
  if (worker) {
    worker.postMessage({ type: 'SKIP_WAITING' });
  }
}

export function clearServiceWorkerCache() {
  if ('serviceWorker' in navigator) {
    const controller = navigator.serviceWorker.controller;
    if (controller) {
      controller.postMessage({ type: 'CLEAR_CACHE' });
    }
  }
}

export async function getServiceWorkerStatus(): Promise<'active' | 'installing' | 'idle'> {
  if (!('serviceWorker' in navigator)) return 'idle';

  const registration = await navigator.serviceWorker.getRegistrations();
  if (registration.length > 0 && registration[0].active) {
    return 'active';
  }

  return 'idle';
}
