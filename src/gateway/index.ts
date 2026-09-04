import { buildGatewayApp } from "./app";

const defaultGatewayPort = 3001;

async function main() {
  const app = buildGatewayApp();
  const port = parseGatewayPort(process.env.GATEWAY_PORT);

  try {
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info("ENHE API Gateway is listening.");
  } catch (error) {
    app.log.error(error, "ENHE API Gateway failed to start.");
    process.exit(1);
  }
}

function parseGatewayPort(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) return defaultGatewayPort;
  return parsed;
}

void main();
