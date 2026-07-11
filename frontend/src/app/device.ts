import { registerDevice } from './api';

const DEVICE_ID_KEY = 'teevo_device_id';
const FINGERPRINT_KEY = 'teevo_fingerprint';
export const ONBOARDING_COMPLETE_KEY = 'teevo_onboarding_complete';

function generateFingerprint(): string {
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

export async function getOrCreateDeviceId(): Promise<string> {
  // Migrate old bakbak keys to teevo keys (one-time)
  const oldId = localStorage.getItem('bakbak_device_id');
  const oldFp = localStorage.getItem('bakbak_fingerprint');
  if (oldId && !localStorage.getItem(DEVICE_ID_KEY)) {
    localStorage.setItem(DEVICE_ID_KEY, oldId);
    if (oldFp) localStorage.setItem(FINGERPRINT_KEY, oldFp);
    localStorage.removeItem('bakbak_device_id');
    localStorage.removeItem('bakbak_fingerprint');
  }

  const stored = localStorage.getItem(DEVICE_ID_KEY);
  const storedFp = localStorage.getItem(FINGERPRINT_KEY);

  if (stored && storedFp) {
    try {
      const { device_id, banned } = await registerDevice(storedFp);
      if (banned) throw new Error('Device is banned');
      localStorage.setItem(DEVICE_ID_KEY, device_id);
      return device_id;
    } catch (e: any) {
      if (e?.message === 'Device is banned') throw e;
      // Transient error — keep the stored ID rather than wiping it
      return stored;
    }
  }

  const fingerprint = generateFingerprint();
  const { device_id, banned } = await registerDevice(fingerprint);
  if (banned) throw new Error('Device is banned');

  localStorage.setItem(DEVICE_ID_KEY, device_id);
  localStorage.setItem(FINGERPRINT_KEY, fingerprint);
  return device_id;
}
