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
  checkForUpdate?: () => Promise<"has-update" | "up-to-date" | "offline-or-error">;
}

export interface PwaLifecycleSnapshot {
  offlineReady: boolean;
  updateAvailable: boolean;
  updateError: string | null;
  checking: boolean;
  checkMessage: string | null;
}

type PwaStarter = (callbacks: PwaLifecycleCallbacks) => PwaController;

export interface PwaLifecycleStore {
  applyUpdate: () => Promise<void>;
  checkForUpdate: () => Promise<"has-update" | "up-to-date" | "offline-or-error">;
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
    checkForUpdate: async () => {
      try {
        await updateServiceWorker(false);
        return "up-to-date";
      } catch {
        return "offline-or-error";
      }
    },
  };
}

export function registerPwa(callbacks: PwaLifecycleCallbacks = {}): PwaController {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return {
      update: async () => {},
      checkForUpdate: async () => "offline-or-error",
    };
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
      if (navigator.serviceWorker.controller) callbacks.onNeedRefresh?.();
      else callbacks.onOfflineReady?.();
    });
  };

  const registrationPromise = navigator.serviceWorker.register(serviceWorkerUrl).then(
    (nextRegistration): ServiceWorkerRegistration | null => {
      registration = nextRegistration;
      if (registration.waiting) callbacks.onNeedRefresh?.();
      else if (registration.active) callbacks.onOfflineReady?.();
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
      callbacks.onRegisterError?.(error);
      return null;
    },
  );

  return {
    update: async () => {
      reloadAfterActivation = true;
      const currentRegistration = registration ?? (await registrationPromise);
      if (!currentRegistration) return;
      if (currentRegistration.waiting) {
        currentRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
        return;
      }
      await currentRegistration.update();
    },
    checkForUpdate: async () => {
      const currentRegistration = registration ?? (await registrationPromise);
      if (!currentRegistration) return "offline-or-error";
      if (currentRegistration.waiting) {
        callbacks.onNeedRefresh?.();
        return "has-update";
      }
      try {
        await currentRegistration.update();
        if (currentRegistration.waiting || currentRegistration.installing) {
          callbacks.onNeedRefresh?.();
          return "has-update";
        }
        return "up-to-date";
      } catch {
        return "offline-or-error";
      }
    },
  };
}

export function createPwaLifecycleStore(startPwa: PwaStarter = registerPwa): PwaLifecycleStore {
  const listeners = new Set<() => void>();
  let controller: PwaController | null = null;
  let started = false;
  let messageTimer: ReturnType<typeof setTimeout> | undefined;
  let snapshot: PwaLifecycleSnapshot = {
    offlineReady: false,
    updateAvailable: false,
    updateError: null,
    checking: false,
    checkMessage: null,
  };

  const updateSnapshot = (next: Partial<PwaLifecycleSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    for (const listener of listeners) listener();
  };

  const setCheckMessage = (msg: string | null, clearDelayMs?: number) => {
    if (messageTimer) clearTimeout(messageTimer);
    updateSnapshot({ checkMessage: msg });
    if (clearDelayMs && msg) {
      messageTimer = setTimeout(() => {
        updateSnapshot({ checkMessage: null });
      }, clearDelayMs);
    }
  };

  const store: PwaLifecycleStore = {
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
    async checkForUpdate() {
      if (!started) store.start();
      if (!controller) return "offline-or-error";
      updateSnapshot({ checking: true });
      setCheckMessage("正在检查更新...");
      try {
        const result = controller.checkForUpdate ? await controller.checkForUpdate() : "up-to-date";
        if (result === "has-update") {
          updateSnapshot({ updateAvailable: true, checking: false });
          setCheckMessage("发现新版本，正在应用...");
          await store.applyUpdate();
          return "has-update";
        } else if (result === "up-to-date") {
          updateSnapshot({ checking: false });
          setCheckMessage("已是最新版本", 2500);
          return "up-to-date";
        } else {
          updateSnapshot({ checking: false });
          setCheckMessage("无法连接更新服务，已使用离线版本", 3000);
          return "offline-or-error";
        }
      } catch {
        updateSnapshot({ checking: false });
        setCheckMessage("检查更新失败", 2500);
        return "offline-or-error";
      }
    },
  };

  return store;
}

export const pwaLifecycle = createPwaLifecycleStore();
