import { registerOTel } from "@vercel/otel";

/**
 * Traces for the server's routes, which Next.js calls once when a server
 * starts. The spans go over OTLP to wherever `OTEL_EXPORTER_OTLP_ENDPOINT`
 * says, Dash0 for now, whose integration sets it on Vercel; with it unset, as
 * in development, they go nowhere.
 *
 * Next.js traces each request and each outgoing `fetch` on its own; the spans
 * worth reading are the sync store's, in `lib/syncStore.ts`.
 */
export function register() {
  registerOTel({ serviceName: "verso" });
}
