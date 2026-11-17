/**
 * server.js
 * Express server for ProfileHub Single Page Application (SPA).
 * Serves static assets and provides an SPA fallback catch-all route for deep linking.
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

// Serve static assets from /public
app.use(express.static(PUBLIC_DIR));

// SPA Catch-All: Route any GET request that doesn't match a static file back to index.html
// This allows HTML5 History API client-side routes (e.g., /register, /dashboard, /about)
// to work seamlessly on deep-linking and browser page refresh.
app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// Start listening
app.listen(PORT, () => {
  console.log("=================================================");
  console.log("  🚀 ProfileHub SPA Server Running Successfully!");
  console.log(`  🌐 Local Access:   http://localhost:${PORT}`);
  console.log(`  📁 Static Assets:  ${PUBLIC_DIR}`);
  console.log("  🔄 SPA Fallback:   Active on all non-static GET routes");
  console.log("=================================================");
});

