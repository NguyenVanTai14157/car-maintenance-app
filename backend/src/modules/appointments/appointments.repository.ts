import { Inject, Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { DatabaseService } from "../../database/database.service";
@Injectable()
export class AppointmentsRepository {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}
  transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.database.transaction(fn);
  }
  lockGarage(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT pg_advisory_xact_lock($1)",
      params,
    );
  }
  lockVehicle(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT pg_advisory_xact_lock($1)",
      params,
    );
  }
  findActiveGarage(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT * FROM garages WHERE id=$1 AND active=true",
      params,
    );
  }
  findVehicleOverlaps(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT id,vehicle_id,starts_at,ends_at FROM appointments WHERE status=ANY($1) AND id<>$2 AND (garage_id=$3 OR vehicle_id=$4) AND starts_at<$5 AND ends_at>$6",
      params,
    );
  }
  findGarageOverlaps(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT starts_at,ends_at FROM appointments WHERE status=ANY($1) AND id<>$2 AND garage_id=$3 AND starts_at<$4 AND ends_at>$5",
      params,
    );
  }
  notifyCustomer(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "INSERT INTO notifications(user_id,appointment_id,message) VALUES($1,$2,$3)",
      params,
    );
  }
  notifyTechnician(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "INSERT INTO notifications(user_id,appointment_id,message) VALUES($1,$2,$3)",
      params,
    );
  }
  findAppointment(params: any[] = [], client?: PoolClient, lock = false) {
    return (client || this.database).query(
      `SELECT * FROM appointments WHERE id=$1${lock ? " FOR UPDATE" : ""}`,
      params,
    );
  }
  lockReminderScan(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT pg_advisory_xact_lock(9061)",
      params,
    );
  }
  findDueReminders(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT a.*,g.notification_template FROM appointments a JOIN garages g ON g.id=a.garage_id WHERE a.status='confirmed' AND a.starts_at>now() AND a.starts_at<=now()+g.reminder_hours*interval '1 hour' AND a.reminded_for IS DISTINCT FROM a.starts_at FOR UPDATE OF a",
      params,
    );
  }
  markReminded(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "UPDATE appointments SET reminded_for=starts_at WHERE id=$1",
      params,
    );
  }
  listVisible(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      `SELECT a.*,v.plate,v.brand,v.model,u.name customer_name,g.name garage_name,g.reminder_hours,t.name technician_name,(SELECT rating FROM reviews WHERE appointment_id=a.id) rating FROM appointments a JOIN vehicles v ON v.id=a.vehicle_id JOIN users u ON u.id=a.customer_id JOIN garages g ON g.id=a.garage_id LEFT JOIN users t ON t.id=a.technician_id WHERE ($1 IN ('admin','receptionist')) OR ($1='customer' AND a.customer_id=$2) OR ($1='technician' AND a.technician_id=$2) ORDER BY a.starts_at DESC`,
      params,
    );
  }
  findVehicle(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT * FROM vehicles WHERE id=$1",
      params,
    );
  }
  findCustomerContact(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT name,email,phone FROM users WHERE id=$1",
      params,
    );
  }
  findGarage(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT * FROM garages WHERE id=$1",
      params,
    );
  }
  listExtras(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT * FROM extras WHERE appointment_id=$1 ORDER BY id",
      params,
    );
  }
  listPhotos(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT * FROM photos WHERE appointment_id=$1 ORDER BY id",
      params,
    );
  }
  findReview(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT * FROM reviews WHERE appointment_id=$1",
      params,
    );
  }
  listEvents(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT e.*,u.name actor FROM events e LEFT JOIN users u ON u.id=e.actor_id WHERE appointment_id=$1 ORDER BY e.id",
      params,
    );
  }
  findOwnedVehicle(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT id FROM vehicles WHERE id=$1 AND owner_id=$2",
      params,
    );
  }
  findActiveServices(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT * FROM services WHERE id=ANY($1) AND active=true",
      params,
    );
  }
  insertAppointment(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "INSERT INTO appointments(customer_id,vehicle_id,garage_id,starts_at,ends_at,services,checklist,notes,total) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
      params,
    );
  }
  recordCreation(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "INSERT INTO events(appointment_id,actor_id,action) VALUES($1,$2,'created')",
      params,
    );
  }
  notifyStaffOfCreation(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "INSERT INTO notifications(user_id,appointment_id,message) SELECT id,$1,$2 FROM users WHERE role IN ('admin','receptionist') AND active=true",
      params,
    );
  }
  lockWorkflow(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT pg_advisory_xact_lock(9060)",
      params,
    );
  }
  findGarageForAction(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT * FROM garages WHERE id=$1",
      params,
    );
  }
  lockVehicleForReceipt(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT * FROM vehicles WHERE id=$1 FOR UPDATE",
      params,
    );
  }
  updateOdometer(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "UPDATE vehicles SET odometer=$1 WHERE id=$2",
      params,
    );
  }
  lockActiveTechnician(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT * FROM users WHERE id=$1 AND role='technician' AND active=true FOR UPDATE",
      params,
    );
  }
  findTechnicianOverlaps(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT id FROM appointments WHERE technician_id=$1 AND id<>$2 AND status IN ('assigned','accepted','in_progress') AND starts_at<$3 AND ends_at>$4",
      params,
    );
  }
  insertExtra(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "INSERT INTO extras(appointment_id,description,amount) VALUES($1,$2,$3)",
      params,
    );
  }
  resolveExtra(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "UPDATE extras SET status=$1 WHERE id=$2 AND appointment_id=$3 AND status='pending' RETURNING *",
      params,
    );
  }
  insertPhoto(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "INSERT INTO photos(appointment_id,kind,data) VALUES($1,$2,$3)",
      params,
    );
  }
  updatePhoto(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "UPDATE photos SET data=$1 WHERE id=$2 AND appointment_id=$3 RETURNING id",
      params,
    );
  }
  deletePhoto(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "DELETE FROM photos WHERE id=$1 AND appointment_id=$2 RETURNING id",
      params,
    );
  }
  findPendingExtras(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT id FROM extras WHERE appointment_id=$1 AND status='pending'",
      params,
    );
  }
  insertReview(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "INSERT INTO reviews(appointment_id,rating,comment) VALUES($1,$2,$3)",
      params,
    );
  }
  sumApprovedExtras(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT coalesce(sum(amount),0) total FROM extras WHERE appointment_id=$1 AND status='approved'",
      params,
    );
  }
  updateAppointment(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "UPDATE appointments SET status=$1,starts_at=$2,ends_at=$3,technician_id=$4,condition=$5,reason=$6,proposed_at=$7,paid=$8,total=$9,checklist=$10,completed_at=$11 WHERE id=$12",
      params,
    );
  }
  insertEvent(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "INSERT INTO events(appointment_id,actor_id,action,note) VALUES($1,$2,$3,$4)",
      params,
    );
  }
  notifyStaffOfAction(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "INSERT INTO notifications(user_id,appointment_id,message) SELECT id,$1,$2 FROM users WHERE role IN ('admin','receptionist') AND active=true",
      params,
    );
  }
}
