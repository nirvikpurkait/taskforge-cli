import { z } from "zod";

export type ScriptDetails = {
  envFile?: string;
  execute: string;
  envDir?: string;
};
export type Scripts = {
  dev?: ScriptDetails;
  build?: ScriptDetails;
  test?: ScriptDetails;
} & Record<string, ScriptDetails>;

export const configSchema = z
  .object({
    envDir: z.string().optional(),
    scripts: z.custom<Scripts>().optional(),
  })
  .optional();

export type Config = z.infer<typeof configSchema>;

/**
 * Defines and validates the CLI configuration.
 *
 * This helper enables strong typing and IDE autocomplete when
 * authoring configuration files. It accepts either a plain
 * configuration object or a factory function that returns one.
 *
 * When a function is provided, it is executed immediately and
 * its return value is used as the final configuration.
 *
 * @example
 * ```ts
 * import { defineConfig } from "taskforge/config";
 *
 * export default defineConfig({
 *   envDir: ".",
 *   scripts: {
 *     build: {
 *       execute: "tsc"
 *     }
 *   }
 * });
 * ```
 *
 * @example
 * ```ts
 * export default defineConfig(() => ({
 *   scripts: {
 *     dev: "pnpm dev"
 *   }
 * }));
 * ```
 *
 * @param config - Configuration object or a function returning it
 * @returns The resolved configuration object
 */

export function defineConfig(config: Config | (() => Config)) {
  if (typeof config === "function") {
    return config();
  }

  return config;
}
