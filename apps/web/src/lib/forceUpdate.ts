/**
 * Force Update & Cache Clearing Utility for Unplastica
 * Aggressively purges PWA Service Workers, CacheStorage, session storage,
 * and stale update flags to guarantee that users always load the latest bundle.
 */

export interface ForceUpdateOptions {
  /** If true, also removes locally saved sanctuary game state for a pristine start */
  resetSaveState?: boolean;
}

export async function forceUpdateAndClearCache(options: ForceUpdateOptions = {}): Promise<void> {
  try {
    // 1. Unregister all active Service Workers
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(async (reg) => {
            try {
              await reg.unregister();
            } catch (err) {
              console.warn('[ForceUpdate] SW unregister error:', err);
            }
          })
        );
      } catch (err) {
        console.warn('[ForceUpdate] getRegistrations error:', err);
      }
    }

    // 2. Wipe all CacheStorage entries
    if ('caches' in window) {
      try {
        const cacheKeys = await window.caches.keys();
        await Promise.all(
          cacheKeys.map(async (key) => {
            try {
              await window.caches.delete(key);
            } catch (err) {
              console.warn(`[ForceUpdate] Cache delete error for key ${key}:`, err);
            }
          })
        );
      } catch (err) {
        console.warn('[ForceUpdate] caches.keys error:', err);
      }
    }

    // 3. Clear SessionStorage
    try {
      window.sessionStorage.clear();
    } catch (err) {
      console.warn('[ForceUpdate] sessionStorage clear error:', err);
    }

    // 4. Clean targeted LocalStorage entries (preserve auth if possible, or reset save state if requested)
    try {
      const keysToRemove = [
        'unplastica_app_version',
        'unplastica_update_available',
        'unplastica_update_notified',
        'unplastica_last_checked_version',
        'unplastica_service_worker_registered',
        'workbox-precache',
      ];

      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && (key.startsWith('workbox-') || key.startsWith('unplastica_cache_') || keysToRemove.includes(key))) {
          window.localStorage.removeItem(key);
        }
      }

      if (options.resetSaveState) {
        window.localStorage.removeItem('unplastica_sanctuary_save_v1');
        window.localStorage.removeItem('unplastica_sanctuary_offline_v1');
      }
    } catch (err) {
      console.warn('[ForceUpdate] localStorage cleanup error:', err);
    }

    // 5. Hard reload with aggressive cache-busting timestamp query parameter
    const targetUrl = new URL(window.location.href);
    targetUrl.searchParams.set('_v', String(Date.now()));
    targetUrl.searchParams.set('_forceUpdate', '1');

    // Use replace so back button doesn't trap them in stale cache state
    window.location.replace(targetUrl.toString());
  } catch (err) {
    console.error('[ForceUpdate] Critical error during cache purge, fallback to hard reload:', err);
    window.location.reload();
  }
}

// Make accessible to console / debug scripts
if (typeof window !== 'undefined') {
  (window as unknown as { __unplasticaForceUpdate: typeof forceUpdateAndClearCache }).__unplasticaForceUpdate = forceUpdateAndClearCache;
}

