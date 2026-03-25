import type { CapacitorConfig } from "@capacitor/cli";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function readEnvValue(key: string): string | undefined {
  const envFiles = [".env.local", ".env"];

  for (const fileName of envFiles) {
    const fullPath = resolve(process.cwd(), fileName);
    if (!existsSync(fullPath)) continue;

    const content = readFileSync(fullPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) continue;

      const k = trimmed.slice(0, separatorIndex).trim();
      if (k !== key) continue;

      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const unquoted = rawValue.replace(/^(["'])(.*)\1$/, "$2");
      if (unquoted) return unquoted;
    }
  }

  return undefined;
}

const serverUrl =
  process.env.CAPACITOR_SERVER_URL ||
  readEnvValue("CAPACITOR_SERVER_URL") ||
  process.env.NEXTAUTH_URL ||
  readEnvValue("NEXTAUTH_URL");

const config: CapacitorConfig = {
  appId: "com.zerowaste.app",
  appName: "ZeroWaste",
  webDir: "dist-capacitor",
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: serverUrl.startsWith("http://"),
      }
    : undefined,
};

export default config;