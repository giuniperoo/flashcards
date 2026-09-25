import { registerOTel } from "@vercel/otel";

/**
 * Traces for the server's routes, which Next.js calls once when a server
 * starts. On Vercel the spans go to whatever trace drain the project has, Dash0
 * for now; with none, and in development, they go nowhere.
 *
 * Next.js traces each request and each outgoing `fetch` on its own; the spans
 * worth reading are the sync store's, in `lib/syncStore.ts`.
 */
export function register() {
  registerOTel({ serviceName: "verso" });
}
