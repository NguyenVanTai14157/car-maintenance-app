import { Inject, Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { DatabaseService } from "../../database/database.service";
@Injectable()
export class ReportsRepository {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}
  transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.database.transaction(fn);
  }
  dailyRevenue(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT to_char(completed_at AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD') period,sum(total)::bigint revenue,count(*)::int count FROM appointments WHERE paid=true AND status='completed' GROUP BY 1 ORDER BY 1 DESC",
      params,
    );
  }
  monthlyRevenue(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT to_char(completed_at AT TIME ZONE 'Asia/Bangkok','YYYY-MM') period,sum(total)::bigint revenue,count(*)::int count FROM appointments WHERE paid=true AND status='completed' GROUP BY 1 ORDER BY 1 DESC",
      params,
    );
  }
  yearlyRevenue(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT to_char(completed_at AT TIME ZONE 'Asia/Bangkok','YYYY') period,sum(total)::bigint revenue,count(*)::int count FROM appointments WHERE paid=true AND status='completed' GROUP BY 1 ORDER BY 1 DESC",
      params,
    );
  }
  popularServices(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT s->>'name' name,count(*)::int count FROM appointments a CROSS JOIN LATERAL jsonb_array_elements(a.services) s WHERE a.status='completed' GROUP BY 1 ORDER BY 2 DESC",
      params,
    );
  }
  summary(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT (SELECT count(*)::int FROM vehicles) vehicles,(SELECT count(*)::int FROM users WHERE role='customer') customers,(SELECT count(*)::int FROM appointments) appointments,(SELECT coalesce(sum(total),0)::bigint FROM appointments WHERE status='completed' AND paid=true) revenue",
      params,
    );
  }
}
