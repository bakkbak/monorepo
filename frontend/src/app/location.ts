const DEFAULT_LAT = 12.9716;
const DEFAULT_LNG = 77.5946;

export type Location = { lat: number; lng: number };

export function getLocation(): Promise<Location> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: DEFAULT_LAT, lng: DEFAULT_LNG }),
      { timeout: 5000, maximumAge: 300000 },
    );
  });
}
