import { useCallback, useEffect, useRef, useState } from "react";

interface ScreenWakeLockSentinel {
  readonly released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: EventListener) => void;
  removeEventListener: (type: "release", listener: EventListener) => void;
}

interface ScreenWakeLockApi {
  request: (type: "screen") => Promise<ScreenWakeLockSentinel>;
}

interface WakeLockState {
  supported: boolean;
  active: boolean;
  error: Error | null;
  release: () => Promise<void>;
}

function getScreenWakeLock(): ScreenWakeLockApi | undefined {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  return (navigator as Navigator & { wakeLock?: ScreenWakeLockApi }).wakeLock;
}

/**
 * Keeps the display awake only while an active practice session needs it. The
 * lock is intentionally released in the background, then reacquired when the
 * learner returns to the exercise.
 */
export function useWakeLock(enabled: boolean): WakeLockState {
  const sentinelRef = useRef<ScreenWakeLockSentinel | null>(null);
  const requestVersionRef = useRef(0);
  const enabledRef = useRef(enabled);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const supported = Boolean(getScreenWakeLock());

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const release = useCallback(async () => {
    requestVersionRef.current += 1;
    const sentinel = sentinelRef.current;
    sentinelRef.current = null;
    setActive(false);

    if (!sentinel || sentinel.released) {
      return;
    }

    try {
      await sentinel.release();
    } catch {
      // The browser may have already released the lock as the page backgrounds.
    }
  }, []);

  const acquire = useCallback(async () => {
    const wakeLock = getScreenWakeLock();
    if (!enabledRef.current || !wakeLock) {
      setActive(false);
      return false;
    }

    if (sentinelRef.current && !sentinelRef.current.released) {
      setActive(true);
      return true;
    }

    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;

    try {
      const sentinel = await wakeLock.request("screen");

      if (requestVersion !== requestVersionRef.current || !enabledRef.current) {
        await sentinel.release();
        return false;
      }

      const handleRelease: EventListener = () => {
        if (sentinelRef.current === sentinel) {
          sentinelRef.current = null;
          setActive(false);
        }
        sentinel.removeEventListener("release", handleRelease);
      };

      sentinel.addEventListener("release", handleRelease);
      sentinelRef.current = sentinel;
      setError(null);
      setActive(true);
      return true;
    } catch (reason) {
      setActive(false);
      setError(reason instanceof Error ? reason : new Error("无法保持屏幕常亮"));
      return false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      void release();
      return;
    }

    void acquire();
    return () => {
      void release();
    };
  }, [acquire, enabled, release]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (enabledRef.current) {
          void acquire();
        }
        return;
      }

      void release();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [acquire, release]);

  return { supported, active, error, release };
}
