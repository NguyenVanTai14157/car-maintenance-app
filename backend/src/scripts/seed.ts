import "dotenv/config";
import { migrate, db } from "../database/connection";
migrate()
  .then(() =>
    console.log(
      "Personal schema ready. Default categories are created when a user registers.",
    ),
  )
  .finally(() => db.end());
