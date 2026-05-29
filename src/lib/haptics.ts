"use client";

export type HapticPattern = "light" | "medium" | "heavy" | "success" | "warning" | "error";

export function triggerHaptic(pattern: HapticPattern = "light") {
  // Safe-guard for SSR and browsers that don't support Vibration API (like iOS Safari)
  if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.vibrate) {
    return;
  }

  try {
    switch (pattern) {
      case "light":
        navigator.vibrate(10);
        break;
      case "medium":
        navigator.vibrate(20);
        break;
      case "heavy":
        navigator.vibrate(40);
        break;
      case "success":
        navigator.vibrate([15, 40, 15]);
        break;
      case "warning":
        navigator.vibrate([30, 40, 30]);
        break;
      case "error":
        navigator.vibrate([50, 40, 50, 40, 50]);
        break;
    }
  } catch (error) {
    console.warn("Haptic feedback error:", error);
  }
}
