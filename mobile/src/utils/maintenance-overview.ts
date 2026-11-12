export const maintenanceFilters = {
  overdue: "Quá hạn",
  due: "Đến hạn",
  soon: "Sắp đến hạn",
};
export type MaintenanceFilter = keyof typeof maintenanceFilters;
export function isMaintenanceFilter(
  value: unknown,
): value is MaintenanceFilter {
  return typeof value === "string" && Object.hasOwn(maintenanceFilters, value);
}
export function matchingVehicleIds(
  plans: { vehicle_id: number; status: string; vehicle_archived?: boolean }[],
  status: MaintenanceFilter,
): Set<number> {
  return new Set(
    plans
      .filter((p) => !p.vehicle_archived && p.status === status)
      .map((p) => p.vehicle_id),
  );
}
