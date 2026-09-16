import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const LOG_PATH = join(process.cwd(), "ingestion", "digest.log");

function write(level: "INFO" | "ERROR", message: string): void {
  const line = `${new Date().toISOString()} [${level}] ${message}\n`;
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  appendFileSync(LOG_PATH, line, "utf-8");
  if (level === "ERROR") {
    console.error(line.trim());
  } else {
    console.log(line.trim());
  }
}

export const log = {
  info: (message: string) => write("INFO", message),
  error: (message: string) => write("ERROR", message),
};
