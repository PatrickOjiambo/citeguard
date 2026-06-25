import app from "./app.js";
import { connectDb } from "./db.js";
import { env } from "./env.js";
import { startCapListener } from "./services/cap.js";

const port = env.PORT;

function main(): void {
  // Connect to MongoDB in the background so the server stays responsive
  // (and /ready reflects DB state) even if the database is slow or down.
  connectDb()
    // eslint-disable-next-line no-console
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB connection failed:", err));

  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Listening: http://localhost:${port}`);
  });

  server.on("error", (err) => {
    if ("code" in err && err.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use.`);
    }
    else {
      console.error("Failed to start server:", err);
    }
    process.exit(1);
  });

  if (env.CAP_ENABLED) {
    startCapListener().catch(err => console.error("CAP listener failed to start:", err));
  }
}

main();
