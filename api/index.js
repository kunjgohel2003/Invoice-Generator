import { handleInvoicesRoute } from "./routes/invoices.js";

/**
 * Vite plugin that mounts API routes to Vite dev server middlewares
 */
export default function apiPlugin() {
  return {
    name: "api-middleware",
    configureServer(server) {
      server.middlewares.use("/api/invoices", handleInvoicesRoute);
    },
  };
}

export { handleInvoicesRoute };
