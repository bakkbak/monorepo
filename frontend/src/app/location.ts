import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

const DEFAULT_LAT = 12.9716;
const DEFAULT_LNG = 77.5946;

export type Location = { lat: number; lng: number };

const DEFAULT_LOCATION: Location = { lat: DEFAULT_LAT, lng: DEFAULT_LNG };

// On native we use the Capacitor Geolocation plugin (which drives the OS
// permission prompt); on the web we fall back to the browser API. Either way a
// denial or timeout resolves to the Bangalore default rather than rejecting, so
// the feed always has coordinates to query with.
async function getNativeLocation(): Promise<Location> {
  try {
    const perm = await Geolocation.checkPermissions();
    if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
      const req = await Geolocation.requestPermissions();
      if (req.location !== 'granted' && req.coarseLocation !== 'granted') {
        return DEFAULT_LOCATION;
      }
    }
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 300000,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return DEFAULT_LOCATION;
  }
}

function getWebLocation(): Promise<Location> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(DEFAULT_LOCATION);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(DEFAULT_LOCATION),
      { timeout: 5000, maximumAge: 300000 },
    );
  });
}

export function getLocation(): Promise<Location> {
  return Capacitor.isNativePlatform() ? getNativeLocation() : getWebLocation();
}
