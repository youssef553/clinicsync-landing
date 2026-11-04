import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { it } from "node:test";
import { pathToFileURL } from "node:url";

it("imports without configuration and fails before creating a Supabase client", () => {
  const moduleUrl = pathToFileURL(
    `${process.cwd()}/src/lib/supabase/server.ts`,
  ).href;
  const probe = `
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const module = await import(${JSON.stringify(moduleUrl)});
    if (typeof module.createSupabaseServerClient !== "function") {
      throw new Error("Supabase server factory was not exported");
    }
    try {
      await module.createSupabaseServerClient();
    } catch (error) {
      if (error?.name !== "SupabaseServerConfigurationError") throw error;
      console.log("missing-config-rejected");
      process.exit(0);
    }
    throw new Error("Expected missing Supabase configuration to be rejected");
  `;

  const result = spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "--input-type=module",
      "--eval",
      probe,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        PATH: process.env.PATH ?? "",
        NODE_ENV: "test",
      },
    },
  );

  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.trim(), "missing-config-rejected");
  assert.equal(result.stderr, "");
});
