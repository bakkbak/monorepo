import { registerDevice } from './api';

const DEVICE_ID_KEY = 'teevo_device_id';
const FINGERPRINT_KEY = 'teevo_fingerprint';

function generateFingerprint(): string {
  const nav = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ].join('|');
  return nav + '|' + crypto.randomUUID();
}

export async function getOrCreateDeviceId(): Promise<string> {
  const stored = localStorage.getItem(DEVICE_ID_KEY);
  const storedFp = localStorage.getItem(FINGERPRINT_KEY);

  // If we have a stored ID, re-register with the same fingerprint to verify it
  // still exists on the backend (handles DB resets gracefully)
  if (stored && storedFp) {
    try {
      const { device_id, banned } = await registerDevice(storedFp);
      if (banned) throw new Error('Device is banned');
      // Update in case backend returned a different ID
      localStorage.setItem(DEVICE_ID_KEY, device_id);
      return device_id;
    } catch {
      // Registration failed — clear and re-register with fresh fingerprint
      localStorage.removeItem(DEVICE_ID_KEY);
      localStorage.removeItem(FINGERPRINT_KEY);
    }
  }

  const fingerprint = generateFingerprint();
  const { device_id, banned } = await registerDevice(fingerprint);
  if (banned) throw new Error('Device is banned');

  localStorage.setItem(DEVICE_ID_KEY, device_id);
  localStorage.setItem(FINGERPRINT_KEY, fingerprint);
  return device_id;
}
