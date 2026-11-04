const assert = require("node:assert/strict");
module.exports = async function audit({
  db,
  base,
  a,
  g,
  service,
  v,
  owner,
  admin,
  reception,
  tech,
  stranger,
  created,
}) {
  const tokens = {
    admin: admin.accessToken,
    receptionist: reception.accessToken,
    technician: tech.accessToken,
    customer: owner.accessToken,
  };
  const failures = [];
  let cases = 0,
    unchanged = 0;
  let concurrencyChecks = 0;
  async function reject(label, path, method, body, token, expected) {
    const r = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const raw = await r.text();
    let d;
    try {
      d = JSON.parse(raw);
    } catch {
      d = { message: raw };
    }
    cases++;
    if (r.status !== expected) {
      failures.push({ label, expected, actual: r.status, message: d.message });
      if (path === "/appointments" && r.status === 201)
        created.appointments.push(d.id);
      if (path === "/vehicles" && r.status === 201) created.vehicles.push(d.id);
    }
  }
  const states = [
    "pending",
    "confirmed",
    "reschedule_proposed",
    "received",
    "assigned",
    "accepted",
    "in_progress",
    "ready",
    "completed",
    "cancelled",
    "rejected",
  ];
  const staff = ["admin", "receptionist"],
    techRoles = ["technician"],
    customer = ["customer"],
    early = ["pending", "confirmed", "reschedule_proposed"],
    working = ["received", "assigned", "accepted", "in_progress"];
  const rules = {
    confirm: [staff, ["pending"]],
    reject: [staff, early],
    cancel: [[...staff, ...customer], early],
    reschedule: [customer, early],
    propose: [staff, early],
    accept_time: [customer, ["reschedule_proposed"]],
    decline_time: [customer, ["reschedule_proposed"]],
    receive: [staff, ["confirmed"]],
    assign: [staff, ["received", "assigned"]],
    accept: [techRoles, ["assigned"]],
    start: [techRoles, ["accepted"]],
    checklist: [techRoles, ["in_progress"]],
    condition: [techRoles, ["accepted", "in_progress"]],
    extra: [[...staff, ...techRoles], working],
    approve_extra: [customer, working],
    reject_extra: [customer, working],
    photo: [techRoles, ["accepted", "in_progress"]],
    photo_update: [techRoles, ["accepted", "in_progress"]],
    photo_delete: [techRoles, ["accepted", "in_progress"]],
    finish: [techRoles, ["in_progress"]],
    payment: [staff, ["ready"]],
    handover: [staff, ["ready"]],
    review: [customer, ["completed"]],
    message: [staff, states],
  };
  try {
    for (const state of states) {
      await db.query(
        "UPDATE appointments SET status=$1,technician_id=$2 WHERE id=$3",
        [state, tech.user.id, a.id],
      );
      for (const [action, [roles, allowed]] of Object.entries(rules))
        for (const role of Object.keys(tokens)) {
          if (roles.includes(role) && allowed.includes(state)) continue;
          const before = (
            await db.query(
              "SELECT row_to_json(a) data FROM appointments a WHERE id=$1",
              [a.id],
            )
          ).rows[0].data;
          await reject(
            `${state}/${role}/${action}`,
            `/appointments/${a.id}/action`,
            "POST",
            { action },
            tokens[role],
            roles.includes(role) ? 400 : 403,
          );
          const after = (
            await db.query(
              "SELECT row_to_json(a) data FROM appointments a WHERE id=$1",
              [a.id],
            )
          ).rows[0].data;
          unchanged++;
          if (JSON.stringify(before) !== JSON.stringify(after))
            failures.push({
              label: `${state}/${role}/${action}: changed data on rejected request`,
            });
        }
    }
    const future = new Date(Date.now() + 15 * 86400000);
    future.setUTCHours(2, 0, 0, 0);
    const body = {
      vehicle_id: a.vehicle_id,
      garage_id: g.id,
      service_ids: [service.id],
      starts_at: future.toISOString(),
    };
    for (const date of [
      "invalid",
      new Date(Date.now() - 86400000).toISOString(),
      future.toISOString().replace("T02:00", "T02:15"),
      future.toISOString().replace("T02:00", "T00:00"),
      future.toISOString().replace("T02:00", "T09:30"),
      "2040-02-30T09:00:00+07:00",
    ])
      await reject(
        "invalid date " + date,
        "/appointments",
        "POST",
        { ...body, starts_at: date },
        tokens.customer,
        400,
      );
    for (const services of [[], [999999999], null])
      await reject(
        "invalid services",
        "/appointments",
        "POST",
        { ...body, service_ids: services },
        tokens.customer,
        400,
      );
    for (const value of [true, [], {}, " ", "1e3"])
      await reject(
        "invalid odometer " + JSON.stringify(value),
        "/vehicles",
        "POST",
        { ...v, plate: "BD" + String(a.id) + String(cases), odometer: value },
        tokens.customer,
        400,
      );
    await reject(
      "unknown service ID",
      "/services/999999999",
      "PATCH",
      {
        name: "No record",
        description: "",
        price: 100,
        duration: 60,
        checklistText: "Check",
        active: true,
      },
      tokens.admin,
      404,
    );
    await reject(
      "unknown garage ID",
      "/garages/999999999",
      "PATCH",
      { ...g, name: "No record" },
      tokens.admin,
      404,
    );
    await db.query(
      "UPDATE appointments SET status='confirmed',starts_at=now()+interval '1 hour',ends_at=now()+interval '2 hour' WHERE id=$1",
      [a.id],
    );
    await db.query("UPDATE garages SET cancel_hours=2 WHERE id=$1", [g.id]);
    await reject(
      "cancel inside cutoff",
      `/appointments/${a.id}/action`,
      "POST",
      { action: "cancel", reason: "Test" },
      tokens.customer,
      400,
    );
    await reject(
      "reschedule inside cutoff",
      `/appointments/${a.id}/action`,
      "POST",
      { action: "reschedule", reason: "Test", starts_at: future.toISOString() },
      tokens.customer,
      400,
    );
    await reject(
      "stranger detail",
      `/appointments/${a.id}`,
      "GET",
      undefined,
      stranger.accessToken,
      403,
    );
    await db.query("UPDATE appointments SET status='received' WHERE id=$1", [
      a.id,
    ]);
    await reject(
      "assign receptionist",
      `/appointments/${a.id}/action`,
      "POST",
      { action: "assign", technician_id: reception.user.id },
      tokens.receptionist,
      400,
    );
    await reject(
      "lock assigned technician",
      "/users/" + tech.user.id,
      "PATCH",
      { ...tech.user, active: false },
      tokens.admin,
      400,
    );

    await db.query("UPDATE appointments SET status='confirmed' WHERE id=$1", [
      a.id,
    ]);
    for (const payload of [
      { condition: "", odometer: 1000 },
      { condition: "Test", odometer: -1 },
      { condition: "Test", odometer: 999 },
    ])
      await reject(
        "invalid receipt",
        `/appointments/${a.id}/action`,
        "POST",
        { action: "receive", ...payload },
        tokens.receptionist,
        400,
      );
    await db.query("UPDATE appointments SET status='in_progress' WHERE id=$1", [
      a.id,
    ]);
    for (const checked of [[], null, ["true", true], [true]])
      await reject(
        "invalid checklist",
        `/appointments/${a.id}/action`,
        "POST",
        { action: "checklist", checked },
        tokens.technician,
        400,
      );
    for (const amount of [-1, " ", true])
      await reject(
        "invalid extra amount",
        `/appointments/${a.id}/action`,
        "POST",
        { action: "extra", description: "Test", amount },
        tokens.technician,
        400,
      );
    await db.query("UPDATE garages SET active=false WHERE id=$1", [g.id]);
    await reject(
      "inactive garage",
      "/appointments",
      "POST",
      body,
      tokens.customer,
      400,
    );
    await db.query("UPDATE garages SET active=true WHERE id=$1", [g.id]);
    const updateKm = (value) =>
      fetch(base + "/vehicles/" + v.id, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + tokens.customer,
        },
        body: JSON.stringify({ ...v, odometer: value }),
      });
    const kmResults = await Promise.all([updateKm(2000), updateKm(1500)]);
    assert.equal(kmResults[0].status, 200);
    assert.ok([200, 400].includes(kmResults[1].status));
    assert.equal(
      (await db.query("SELECT odometer FROM vehicles WHERE id=$1", [v.id]))
        .rows[0].odometer,
      2000,
    );
    concurrencyChecks++;
    await db.query("UPDATE appointments SET status='pending' WHERE id=$1", [
      a.id,
    ]);
    const confirm = () =>
      fetch(base + `/appointments/${a.id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + tokens.receptionist,
        },
        body: JSON.stringify({ action: "confirm" }),
      });
    const confirmations = await Promise.all([confirm(), confirm()]);
    assert.deepEqual(confirmations.map((r) => r.status).sort(), [201, 400]);
    concurrencyChecks++;
  } finally {
    await db.query(
      "UPDATE appointments SET status=$1,technician_id=$2,starts_at=$3,ends_at=$4 WHERE id=$5",
      [a.status, a.technician_id, a.starts_at, a.ends_at, a.id],
    );
    await db.query(
      "UPDATE garages SET cancel_hours=0,active=true WHERE id=$1",
      [g.id],
    );
    await db.query("UPDATE vehicles SET odometer=$1 WHERE id=$2", [
      v.odometer,
      v.id,
    ]);
  }
  console.log(
    JSON.stringify(
      {
        constraintAudit: {
          rejectedRequests: cases,
          unchangedChecks: unchanged,
          concurrencyChecks,
          failures,
        },
      },
      null,
      2,
    ),
  );
  assert.equal(failures.length, 0, "Constraint audit failed; see cases above");
};
