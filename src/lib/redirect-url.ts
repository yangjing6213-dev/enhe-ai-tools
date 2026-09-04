export function resolveRedirectUrl(target: string, requestUrl: string) {
  return new URL(target, requestUrl);
}

type FormRedirectUrlOptions = {
  appUrl?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  host?: string | null;
  originHeader?: string | null;
};

const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const trustedProtocols = new Set(["http:", "https:"]);

function firstHeaderValue(value?: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function parseUrl(value?: string | null) {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function normalizeForwardedProtocol(value?: string | null) {
  const protocol = firstHeaderValue(value)?.toLowerCase();
  if (protocol === "http" || protocol === "https") return `${protocol}:`;
  return null;
}

function buildExternalRequestUrl(requestUrl: string, options: FormRedirectUrlOptions) {
  const request = new URL(requestUrl);
  const externalHost = firstHeaderValue(options.forwardedHost) ?? firstHeaderValue(options.host);
  if (!externalHost) return request;

  const protocol = normalizeForwardedProtocol(options.forwardedProto) ?? request.protocol;
  if (!trustedProtocols.has(protocol)) return request;

  try {
    return new URL(`${protocol}//${externalHost}${request.pathname}${request.search}`);
  } catch {
    return request;
  }
}

function isTrustedFormOrigin(origin: URL, request: URL, configuredOrigin: URL | null) {
  if (!trustedProtocols.has(origin.protocol)) return false;
  if (origin.host === request.host) return true;
  if (configuredOrigin && origin.host === configuredOrigin.host) return true;
  return loopbackHosts.has(origin.hostname) && loopbackHosts.has(request.hostname) && origin.port === request.port;
}

function normalizeFormRedirectOptions(options?: string | FormRedirectUrlOptions | null): FormRedirectUrlOptions {
  if (typeof options === "string" || options === null || options === undefined) {
    return { originHeader: options };
  }
  return options;
}

export function resolveFormRedirectUrl(
  target: string,
  requestUrl: string,
  options?: string | FormRedirectUrlOptions | null
) {
  const context = normalizeFormRedirectOptions(options);
  const request = buildExternalRequestUrl(requestUrl, context);
  const configuredOrigin = parseUrl(context.appUrl);
  const origin = parseUrl(context.originHeader);

  if (origin) {
    if (isTrustedFormOrigin(origin, request, configuredOrigin)) {
      return new URL(target, origin);
    }
  }

  if (configuredOrigin && trustedProtocols.has(configuredOrigin.protocol)) {
    return new URL(target, configuredOrigin);
  }

  return new URL(target, request);
}

export function resolveFormRedirectUrlFromRequest(target: string, request: Request) {
  return resolveFormRedirectUrl(target, request.url, {
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    host: request.headers.get("host"),
    originHeader: request.headers.get("origin")
  });
}
