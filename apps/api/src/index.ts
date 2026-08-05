import http from "node:http";
import { logger } from "@repo/logger";
import { app as expressApplication } from "./server";

import { env } from "./env";

async function init() {
  try {
    const server = http.createServer(expressApplication);
    const PORT = parseInt(env.PORT, 10);
    server.listen(PORT, () => {
      logger.info(`http server is running on PORT ${PORT}`);

      // Automated health check every 10 minutes to generate metrics for Innjest dashboard
      setInterval(async () => {
        try {
          await fetch(`http://localhost:${PORT}/trpc/health.getHealth`);
        } catch {
          // ignore fetch error if server is stopping
        }
      }, 10 * 60 * 1000);
    });
  } catch (err) {
    logger.error(`Error creating http server`, { err });
    process.exit(1);
  }
}

init();
