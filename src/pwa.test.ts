// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  createPwaLifecycleStore,
  registerPwaWith,
  requestPersistentStorage,
  type PwaRegister,
} from "./pwa";

describe("requestPersistentStorage", () => {
  it("does not request persistence when storage is already persistent", async () => {
    const storage = {
      persisted: vi.fn().mockResolvedValue(true),
      persist: vi.fn(),
    } as unknown as StorageManager;

    await expect(requestPersistentStorage(storage)).resolves.toBe(true);
    expect(storage.persisted).toHaveBeenCalledOnce();
    expect(storage.persist).not.toHaveBeenCalled();
  });

  it("requests persistence when the browser supports it but has not granted it", async () => {
    const storage = {
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockResolvedValue(true),
    } as unknown as StorageManager;

    await expect(requestPersistentStorage(storage)).resolves.toBe(true);
    expect(storage.persist).toHaveBeenCalledOnce();
  });

  it("reports false when persistent storage is unavailable", async () => {
    await expect(requestPersistentStorage(undefined)).resolves.toBe(false);
  });

  it("reports false when the browser rejects the persistence request", async () => {
    const storage = {
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockRejectedValue(new Error("denied")),
    } as unknown as StorageManager;

    await expect(requestPersistentStorage(storage)).resolves.toBe(false);
  });
});

describe("PWA lifecycle store", () => {
  it("announces offline readiness and lets the user apply a downloaded update", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const register = vi.fn((callbacks) => {
      callbacks.onOfflineReady?.();
      callbacks.onNeedRefresh?.();
      return { update };
    });
    const store = createPwaLifecycleStore(register);
    const listener = vi.fn();
    store.subscribe(listener);

    store.start();

    expect(store.getSnapshot()).toMatchObject({ offlineReady: true, updateAvailable: true });
    await store.applyUpdate();
    expect(update).toHaveBeenCalledOnce();
    expect(store.getSnapshot().updateError).toBeNull();
  });

  it("keeps the current version usable when applying an update fails", async () => {
    const store = createPwaLifecycleStore(() => ({
      update: vi.fn().mockRejectedValue(new Error("offline")),
    }));
    store.start();

    await store.applyUpdate();

    expect(store.getSnapshot().updateError).toContain("当前版本");
  });
});

describe("registerPwaWith", () => {
  it("registers immediately and forwards lifecycle callbacks", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const register = vi.fn(() => update) as unknown as PwaRegister;
    const onOfflineReady = vi.fn();
    const onNeedRefresh = vi.fn();

    const controller = registerPwaWith(register, {
      onOfflineReady,
      onNeedRefresh,
    });

    expect(register).toHaveBeenCalledWith({
      immediate: true,
      onOfflineReady,
      onNeedRefresh,
      onRegisterError: undefined,
    });

    await controller.update();
    expect(update).toHaveBeenCalledWith(true);
  });
});
