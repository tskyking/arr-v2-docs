// Packaging only: copies the static intake UI next to the compiled API.
// No runtime data, uploaded images or credentials are copied by this script.
import { cpSync, mkdirSync } from "node:fs";
mkdirSync("dist/access-public", { recursive: true });
cpSync("services/api/src/access/public", "dist/access-public", {
  recursive: true,
});
