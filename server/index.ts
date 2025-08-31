import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { registerRoutes } from "./routes";
// IMPORTANT: avoid importing from './vite' at the top level to prevent bundling 'vite' in production
import { initializeFirebase } from "./initialize-firebase";
import { testEmailConnection } from "./emailService";

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Minimal CORS middleware to allow external access if needed
const allowedOrigins = new Set([
  'https://agribusiness-2.onrender.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CORS_ORIGIN || ''
].filter(Boolean));

app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  if (origin && allowedOrigins.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  } as any;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize Firebase collections
  await initializeFirebase();
  // Test email connection on startup for visibility
  await testEmailConnection();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Serve static files from the built React app
  if (process.env.NODE_ENV === 'production') {
    // Serve static files from the client/dist directory
    const clientDistPath = path.resolve(process.cwd(), 'client/dist');
    app.use(express.static(clientDistPath));
    
    // Handle React Router by serving index.html for all non-API routes
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(clientDistPath, 'index.html'));
      }
    });
    
    log("Production mode: serving API + React frontend");
  } else {
    // Only setup Vite in development to avoid bundling it in production
    if (app.get("env") === "development") {
      const viteMod = await import("./vite.js").catch(() => undefined);
      if (viteMod && typeof (viteMod as any).setupVite === 'function') {
        await (viteMod as any).setupVite(app, server);
        (viteMod as any).log?.("Vite dev middleware enabled", "vite");
      } else {
        log("Vite not available; running API only in dev.");
      }
    }
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
