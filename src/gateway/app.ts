import Fastify from "fastify";
import { registerChatCompletionRoutes } from "./chat-completions";
import { registerModelRoutes } from "./models";

export function buildGatewayApp() {
  const app = Fastify({
    logger: false
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "enhe-api-gateway"
  }));

  registerModelRoutes(app);
  registerChatCompletionRoutes(app);

  return app;
}
