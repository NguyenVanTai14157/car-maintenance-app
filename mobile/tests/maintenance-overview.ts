import assert from "node:assert/strict";
import { planAlert } from "../src/utils/plan-alert";
import {
  matchingVehicleIds,
  isMaintenanceFilter,
} from "../src/utils/maintenance-overview";
const today = "2026-11-11";
const km = planAlert(
  {
    status: "overdue",
    due_date: "2026-11-19",
    due_km: 4000,
    current_km: 20000,
  },
  today,
);
assert.equal(km.label, "Quá hạn theo km: vượt 16.000 km");
assert.ok(
  km.details.includes("Chưa đến hạn theo ngày: còn 8 ngày (hạn 19/11/2026)."),
);
assert.ok(km.details.some((d) => d.includes("đã vượt 16.000 km")));
assert.equal(
  planAlert({ status: "soon", due_date: "2026-11-13" }, today).label,
  "Sắp đến hạn: còn 2 ngày",
);
assert.equal(
  planAlert({ status: "soon", due_date: "2026-11-12" }, today).label,
  "Sắp đến hạn: còn 1 ngày",
);
assert.equal(
  planAlert({ status: "due", due_date: today }, today).label,
  "Đến hạn hôm nay",
);
assert.equal(
  planAlert({ status: "overdue", due_date: "2026-11-08" }, today).label,
  "Quá hạn theo ngày: trễ 3 ngày",
);
assert.equal(
  planAlert(
    { status: "overdue", due_date: today, due_km: 4000, current_km: 20000 },
    today,
  ).label,
  "Quá hạn theo km: vượt 16.000 km",
);
assert.equal(
  planAlert(
    {
      status: "overdue",
      due_date: "2026-11-10",
      due_km: 4000,
      current_km: 20000,
    },
    today,
  ).label,
  "Quá hạn theo ngày và km: trễ 1 ngày / vượt 16.000 km",
);
assert.equal(
  planAlert({ status: "soon", due_km: 20500, current_km: 20000 }, today).label,
  "Sắp đến hạn: còn 500 km",
);
assert.equal(
  planAlert(
    {
      status: "soon",
      due_date: "2026-11-13",
      due_km: 20500,
      current_km: 20000,
    },
    today,
  ).label,
  "Sắp đến hạn: còn 2 ngày / còn 500 km",
);
for (const [status, label] of [
  ["completed", "Hoàn thành"],
  ["cancelled", "Đã hủy"],
  ["planned", "Chưa đến hạn"],
]) {
  assert.deepEqual(
    planAlert(
      { status, due_date: "2026-01-01", due_km: 0, current_km: 20000 },
      today,
    ),
    { label, details: [] },
  );
}
const plans = [
  { vehicle_id: 1, status: "overdue" },
  { vehicle_id: 1, status: "overdue" },
  { vehicle_id: 2, status: "soon" },
  { vehicle_id: 3, status: "overdue", vehicle_archived: true },
  { vehicle_id: 4, status: "cancelled" },
  { vehicle_id: 5, status: "completed" },
];
assert.deepEqual([...matchingVehicleIds(plans, "overdue")], [1]);
assert.deepEqual([...matchingVehicleIds(plans, "soon")], [2]);
assert.equal(matchingVehicleIds(plans, "due").size, 0);
assert.equal(isMaintenanceFilter("overdue"), true);
assert.equal(isMaintenanceFilter("unknown"), false);
console.log(
  "PASS alerts for dates/km/mixed thresholds and unique active vehicle counts",
);
