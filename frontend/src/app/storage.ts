import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// Unified key/value storage. On the web this is synchronous localStorage wrapped
// in promises; on native it's Capacitor Preferences (persists across WebView
// upgrades and app reinstalls-in-place, unlike localStorage which the OS can
// evict). Keep the API async everywhere so callers don't branch on platform.
export const isNative = Capacitor.isNativePlatform();

export async function storageGet(key: string): Promise<string | null> {
  if (isNative) {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  }
  return localStorage.getItem(key);
}

export async function storageSet(key: string, value: string): Promise<void> {
  if (isNative) {
    await Preferences.set({ key, value });
    return;
  }
  localStorage.setItem(key, value);
}

export async function storageRemove(key: string): Promise<void> {
  if (isNative) {
    await Preferences.remove({ key });
    return;
  }
  localStorage.removeItem(key);
}
