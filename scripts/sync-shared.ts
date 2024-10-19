import fs from "fs";
import path from "path";

const BACKEND_DIR = "./src/shared";
const FRONTEND_DIR = "../react-dashboard/src/generated";

console.log(`Copying files...`);
fs.cpSync(path.resolve(BACKEND_DIR), path.resolve(FRONTEND_DIR), {
  recursive: true,
});
console.log(`✅ Copied files from ${BACKEND_DIR} → ${FRONTEND_DIR}`);
