export function buildDeliveryOrderNote(note, lat, lng) {
  const parts = [];
  if (note?.trim()) parts.push(note.trim());
  const latNum = lat != null && lat !== "" ? Number(lat) : null;
  const lngNum = lng != null && lng !== "" ? Number(lng) : null;
  if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
    parts.push(`Konum: ${latNum}, ${lngNum}`);
  }
  return parts.join("\n");
}

export function formatDeliveryAddress(tableNo) {
  return tableNo?.trim() || "";
}
