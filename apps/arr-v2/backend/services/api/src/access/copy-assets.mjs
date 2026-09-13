import { cpSync, mkdirSync } from "node:fs";
mkdirSync("dist/access-public", { recursive: true });
cpSync("services/api/src/access/public", "dist/access-public", {
  recursive: true,
});
