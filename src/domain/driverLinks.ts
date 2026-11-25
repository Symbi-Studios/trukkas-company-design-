export function driverDetailHref(id: string) {
  return `/drivers/detail?driverId=${encodeURIComponent(id)}`;
}
