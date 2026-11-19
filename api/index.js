import { handleInvoicesRoute } from "./routes/invoices.js";
import { handleUsersRoute } from "./routes/users.js";

/**
 * Vite plugin that mounts API routes to Vite dev server middlewares
 */
export default function apiPlugin() {
  return {
    name: "api-middleware",
    configureServer(server) {
      server.middlewares.use("/api/users", handleUsersRoute);
      server.middlewares.use("/api/invoices", handleInvoicesRoute);
    },
  };
}

export { handleInvoicesRoute, handleUsersRoute };
