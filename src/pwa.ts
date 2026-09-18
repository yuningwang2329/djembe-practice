type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

export interface PwaRegistrationOptions extends PwaLifecycleCallbacks {
  immediate?: boolean;
}

export type PwaRegister = (options: PwaRegistrationOptions) => UpdateServiceWorker;

export interface PwaLifecycleCallbacks {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisterError?: (error: unknown) => void;
}

export interface PwaController {
  update: () => Promise<void>;
}

export interface PwaLifecycleSnapshot {
  offlineReady: boolean;
  updateAvailable: boolean;
  updateError: string | null;
}

type PwaStarter = (callbacks: PwaLifecycleCallbacks) => PwaController;

export interface PwaLifecycleStore {
  applyUpdate: () => Promise<void>;
  getSnapshot: () => PwaLifecycleSnapshot;
  start: () => void;
  subscribe: (listener: () => void) => () => void;
}

/**
 * Request durable browser storage for user-imported audio. Browsers may decline
 * this request, so callers must continue to support a non-persistent cache.
 */
export async function requestPersistentStorage(
  storage: Pick<StorageManager, "persisted" | "persist"> | undefined =
    typeof navigator === "undefined" ? undefined : navigator.storage,
): Promise<boolean> {
  if (!storage?.persisted || !storage.persist) {
    return false;
  }

  try {
    if (await storage.persisted()) {
      return true;
    }

    return await storage.persist();
  } catch {
    return false;
  }
}

/**
 * Makes the PWA registration testable while keeping the real Vite registration
 * in one small production-only boundary.
 */
export function registerPwaWith(
  register: PwaRegister,
  { onNeedRefresh, onOfflineReady, onRegisterError }: PwaLifecycleCallbacks = {},
): PwaController {
  const updateServiceWorker = register({
    immediate: true,
    onNeedRefresh,
    onOfflineReady,
    onRegisterError,
  });

  return {
    update: () => updateServiceWorker(true),
  };
}

export function registerPwa(callbacks: PwaLifecycleCallbacks = {}): PwaController {
  return registerPwaWith(registerBrowserServiceWorker, callbacks);
}

function registerBrowserServiceWorker(options: PwaRegistrationOptions): UpdateServiceWorker {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return async () => {};
  }

  let reloadAfterActivation = false;
  let registration: ServiceWorkerRegistration | null = null;
  const serviceWorkerUrl = `${import.meta.env.BASE_URL}sw.js`;

  const reloadOnControllerChange = () => {
    if (reloadAfterActivation) window.location.reload();
  };
  navigator.serviceWorker.addEventListener("controllerchange", reloadOnControllerChange);

  const watchInstallingWorker = (worker: ServiceWorker) => {
    worker.addEventListener("statechange", () => {
      if (worker.state !== "installed") return;
      if (navigator.serviceWorker.controller) options.onNeedRefresh?.();
      else options.onOfflineReady?.();
    });
  };

  const registrationPromise = navigator.serviceWorker.register(serviceWorkerUrl).then(
    (nextRegistration): ServiceWorkerRegistration | null => {
      registration = nextRegistration;
      if (registration.waiting) options.onNeedRefresh?.();
      else if (registration.active) options.onOfflineReady?.();
      if (registration.installing) watchInstallingWorker(registration.installing);
      registration.addEventListener("updatefound", () => {
        if (registration?.installing) watchInstallingWorker(registration.installing);
      });

      const triggerUpdate = () => {
        if (registration) {
          registration.update().catch(() => {});
        }
      };

      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") triggerUpdate();
        });
      }
      if (typeof window !== "undefined") {
        window.addEventListener("focus", triggerUpdate);
      }

      return registration;
    },
    (error): null => {
      options.onRegisterError?.(error);
      return null;
    },
  );

  return async (reloadPage = false) => {
    reloadAfterActivation = reloadPage;
    const currentRegistration = registration ?? await registrationPromise;
    if (!currentRegistration) return;
    if (currentRegistration.waiting) {
      currentRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
      return;
    }
    await currentRegistration.update();
  };
}

export function createPwaLifecycleStore(startPwa: PwaStarter = registerPwa): PwaLifecycleStore {
  const listeners = new Set<() => void>();
  let controller: PwaController | null = null;
  let started = false;
  let snapshot: PwaLifecycleSnapshot = {
    offlineReady: false,
    updateAvailable: false,
    updateError: null,
  };

  const updateSnapshot = (next: Partial<PwaLifecycleSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    for (const listener of listeners) listener();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      if (started) return;
      started = true;
      controller = startPwa({
        onOfflineReady: () => updateSnapshot({ offlineReady: true }),
        onNeedRefresh: () => updateSnapshot({ updateAvailable: true, updateError: null }),
        onRegisterError: () => updateSnapshot({ updateError: "离线缓存暂时不可用，联网后会自动重试" }),
      });
    },
    async applyUpdate() {
      if (!controller) return;
      try {
        await controller.update();
        updateSnapshot({ updateError: null });
      } catch {
        updateSnapshot({ updateError: "更新失败，当前版本仍可继续使用" });
      }
    },
  };
}

export const pwaLifecycle = createPwaLifecycleStore();
