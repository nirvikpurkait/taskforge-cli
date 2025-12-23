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

export function defineConfig(config: Config | (() => Config)) {
  if (typeof config === "function") {
    return config();
  }

  return config;
}

// const d: Config = { scripts: { studio: { run: "" } } };
