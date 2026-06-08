export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestBranch(branches, lat, lng) {
  let nearest = null;
  let minKm = Infinity;

  for (const branch of branches) {
    const branchLat = Number(branch.lat);
    const branchLng = Number(branch.lng);
    if (!Number.isFinite(branchLat) || !Number.isFinite(branchLng)) continue;
    const km = haversineKm(lat, lng, branchLat, branchLng);
    if (km < minKm) {
      minKm = km;
      nearest = { branch, distanceKm: km };
    }
  }

  return nearest;
}

export function requestUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  });
}
