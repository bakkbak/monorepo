import { registerDevice } from './api';
import { isNative, storageGet, storageSet, storageRemove } from './storage';

const DEVICE_ID_KEY = 'teevo_device_id';
const FINGERPRINT_KEY = 'teevo_fingerprint';
export const ONBOARDING_COMPLETE_KEY = 'teevo_onboarding_complete';

// The backend treats the "fingerprint" as an opaque stable identifier for a
// device. On the web we derive one from browser characteristics; on native
// those are meaningless (and a WebView upgrade would rotate a UA-based
// fingerprint and orphan the user's posts), so we mint a random UUID once and
// persist it in native storage.
function generateWebFingerprint(): string {
  const parts = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    navigator.hardwareConcurrency,
    new Date().getTimezoneOffset(),
  ].join('|');
  return parts;
}

async function getOrCreateFingerprint(): Promise<string> {
  if (isNative) {
    const existing = await storageGet(FINGERPRINT_KEY);
    if (existing) return existing;
    const uuid =
      globalThis.crypto?.randomUUID?.() ??
      `teevo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await storageSet(FINGERPRINT_KEY, uuid);
    return uuid;
  }
  return generateWebFingerprint();
}

export async function getOrCreateDeviceId(): Promise<string> {
  // Migrate old bakbak keys to teevo keys (one-time, web only)
  if (!isNative) {
    const oldId = localStorage.getItem('bakbak_device_id');
    const oldFp = localStorage.getItem('bakbak_fingerprint');
    if (oldId && !localStorage.getItem(DEVICE_ID_KEY)) {
      localStorage.setItem(DEVICE_ID_KEY, oldId);
      if (oldFp) localStorage.setItem(FINGERPRINT_KEY, oldFp);
      localStorage.removeItem('bakbak_device_id');
      localStorage.removeItem('bakbak_fingerprint');
    }
  }

  const stored = await storageGet(DEVICE_ID_KEY);
  const storedFp = await storageGet(FINGERPRINT_KEY);

  if (stored && storedFp) {
    // Fast path: we already know who this device is. Return immediately so the
    // feed can load without waiting on a network round-trip, and refresh the
    // registration in the background (keeps server-side state fresh and lets a
    // changed id/ban surface on the next launch).
    void registerDevice(storedFp)
      .then(({ device_id }) => storageSet(DEVICE_ID_KEY, device_id))
      .catch(() => {});
    return stored;
  }

  const fingerprint = await getOrCreateFingerprint();
  const { device_id, banned } = await registerDevice(fingerprint);
  if (banned) throw new Error('Device is banned');

  await storageSet(DEVICE_ID_KEY, device_id);
  await storageSet(FINGERPRINT_KEY, fingerprint);
  return device_id;
}

// Onboarding-complete flag helpers, so callers never touch localStorage
// directly (native uses Preferences under the hood).
export async function isOnboardingComplete(): Promise<boolean> {
  return (await storageGet(ONBOARDING_COMPLETE_KEY)) === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  await storageSet(ONBOARDING_COMPLETE_KEY, 'true');
}

export async function clearOnboardingComplete(): Promise<void> {
  await storageRemove(ONBOARDING_COMPLETE_KEY);
}
