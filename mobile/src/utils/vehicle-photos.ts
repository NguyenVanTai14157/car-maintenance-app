export const MAX_VEHICLE_PHOTOS = 10;
export function vehiclePhotos(
  vehicle?: { images?: string[]; image?: string } | null,
): string[] {
  if (Array.isArray(vehicle?.images) && vehicle.images.length)
    return vehicle.images;
  return vehicle?.image ? [vehicle.image] : [];
}
