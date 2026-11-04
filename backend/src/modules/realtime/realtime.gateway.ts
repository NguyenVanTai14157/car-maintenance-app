import { Inject, Logger, OnApplicationShutdown } from "@nestjs/common";
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from "@nestjs/websockets";
import { Namespace, Socket } from "socket.io";
import { Client } from "pg";
import { RealtimeAuthService } from "./realtime-auth.service";
interface Change {
  users: (number | null)[];
  roles: string[];
  resources: string[];
}
@WebSocketGateway({
  namespace: "/realtime",
  cors: { origin: true },
  maxHttpBufferSize: 16384,
})
export class RealtimeGateway implements OnGatewayInit, OnApplicationShutdown {
  @WebSocketServer() server: Namespace;
  private client?: Client;
  private retry?: ReturnType<typeof setTimeout>;
  private audit?: ReturnType<typeof setInterval>;
  private stopped = false;
  private queue = Promise.resolve();
  private readonly logger = new Logger(RealtimeGateway.name);
  constructor(
    @Inject(RealtimeAuthService) private readonly auth: RealtimeAuthService,
  ) {}
  afterInit(server: Namespace) {
    server.use((socket, next) => {
      void this.auth
        .authenticate(socket.handshake.auth?.token)
        .then((user) => {
          socket.data.user = user;
          next();
        })
        .catch(() => next(new Error("SESSION_EXPIRED")));
    });
    this.audit = setInterval(() => {
      void this.publish({
        users: [],
        roles: ["admin", "receptionist", "technician", "customer"],
        resources: [],
      });
    }, 30000);
    this.audit.unref();
    void this.listen();
  }
  private async listen() {
    if (this.stopped) return;
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    this.client = client;
    let failed = false;
    const recover = () => {
      if (failed || this.stopped) return;
      failed = true;
      void client.end().catch(() => {});
      this.logger.warn("Realtime database listener disconnected; retrying");
      this.retry = setTimeout(() => void this.listen(), 3000);
      this.retry.unref();
    };
    client.on("error", recover);
    client.on("end", recover);
    client.on("notification", (msg) => {
      try {
        const change = JSON.parse(msg.payload || "") as Change;
        this.queue = this.queue
          .then(() => this.publish(change))
          .catch(() => this.logger.error("Realtime dispatch failed"));
      } catch {
        this.logger.warn("Invalid change notification");
      }
    });
    try {
      await client.connect();
      await client.query("LISTEN autocare_changes");
      if (this.stopped) {
        await client.end();
        return;
      }
      // LISTEN has no replay; resync all connected clients after initial/reconnection.
      await this.publish({
        users: [],
        roles: ["admin", "receptionist", "technician", "customer"],
        resources: ["*"],
      });
    } catch {
      recover();
    }
  }
  private async publish(change: Change) {
    if (this.stopped) return;
    await Promise.all(
      [...this.server.sockets.values()].map(async (socket: Socket) => {
        const old = socket.data.user as { id: number; role: string };
        if (
          !old ||
          (!change.users.includes(old.id) && !change.roles.includes(old.role))
        )
          return;
        try {
          const user = await this.auth.authenticate(
            socket.handshake.auth?.token,
          );
          if (user.role !== old.role) throw Error("Role changed");
          if (change.resources.length)
            socket.emit("data:changed", { resources: change.resources });
        } catch {
          socket.emit("session:expired");
          socket.disconnect(true);
        }
      }),
    );
  }
  async onApplicationShutdown() {
    this.stopped = true;
    if (this.retry) clearTimeout(this.retry);
    if (this.audit) clearInterval(this.audit);
    await this.client?.end().catch(() => {});
  }
}
