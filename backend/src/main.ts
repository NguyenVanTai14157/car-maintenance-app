import "dotenv/config";
import "reflect-metadata";
import { bootstrap } from "./bootstrap";
bootstrap().catch((error) => {
  console.error("Cannot start backend:", error.message);
  process.exit(1);
});
