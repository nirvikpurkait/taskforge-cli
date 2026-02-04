/**
 * Unit tests for script identification and environment file resolution.
 *
 * This test suite validates:
 * - Script name detection from CLI arguments
 * - Correct `.env` file resolution based on script type
 * - Priority-based env file loading rules
 * - Optional scanning directory support
 * - Cross-platform path handling (Windows / POSIX)
 *
 * The filesystem is fully mocked using `memfs` to ensure tests
 * are isolated and do not touch the real filesystem.
 */

import {
  availableEnvFile,
  extractCliOptions,
  extractScriptRelatedCliOptions,
  identifyScript,
} from "@/utils";
import { expect, describe, test, vi, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";
import path from "node:path";

/**
 * Mock Node's `fs` module using `memfs`.
 * All filesystem operations occur in-memory.
 */
vi.mock("fs", async () => {
  const memfs = await import("memfs");
  return memfs.fs;
});

/**
 * Tests for identifying the script name from CLI arguments.
 *
 * Ensures:
 * - Known scripts (`dev`, `build`, `test`) are detected correctly
 * - Custom scripts are extracted using `run <script-name>`
 * - Invalid inputs throw appropriate errors
 */
describe("identify script name", () => {
  test("return `dev` as script name", () => {
    const scriptName = identifyScript(["dev"]);
    expect(scriptName).toBe("dev");
  });

  test("return `build` as script name", () => {
    const scriptName = identifyScript(["build"]);
    expect(scriptName).toBe("build");
  });

  test("return `test` as script name", () => {
    const scriptName = identifyScript(["test"]);
    expect(scriptName).toBe("test");
  });

  test("returns custom script name as script name", () => {
    const scriptName = identifyScript(["run", "name"]);
    expect(scriptName).toBe("name");
  });

  test("throws error if `run` keyword is not available for custom script", () => {
    expect(() => identifyScript(["name"])).toThrowError();
  });
});

/**
 * Tests for resolving the correct environment file to load.
 */
describe("determine env file path to load", () => {
  /**
   * Reset the in-memory filesystem before and after each test
   * to prevent state leakage.
   */
  beforeEach(() => {
    vol.reset();
  });

  afterEach(() => {
    vol.reset();
  });

  /**
   * Environment resolution behavior for the `dev` script.
   *
   * Priority order:
   * .env.development.local
   * .env.development
   * .env.local
   * .env
   */
  describe("for `dev` script", () => {
    /**
     * Tests when no scanning directory is provided.
     * Files are resolved relative to the project root.
     */
    describe("when `env` dir is not provided", () => {
      test("no env file is present at the root", () => {
        const filepath = availableEnvFile({ scriptName: "dev" });
        expect(filepath).toBe(null);
      });

      test("4 env files present", () => {
        vol.fromJSON({
          ".env.development.local": "",
          ".env.development": "",
          ".env.local": "",
          ".env": "",
        });

        const filepath = availableEnvFile({ scriptName: "dev" });
        expect(filepath).toBe(".env.development.local");
      });

      test("3 env files present", () => {
        vol.fromJSON({
          ".env.development": "",
          ".env.local": "",
          ".env": "",
        });

        const filepath = availableEnvFile({ scriptName: "dev" });
        expect(filepath).toBe(".env.development");
      });

      test("2 env files present", () => {
        vol.fromJSON({
          ".env.local": "",
          ".env": "",
        });

        const filepath = availableEnvFile({ scriptName: "dev" });
        expect(filepath).toBe(".env.local");
      });

      test("1 env file present", () => {
        vol.fromJSON({ ".env": "" });

        const filepath = availableEnvFile({ scriptName: "dev" });
        expect(filepath).toBe(".env");
      });
    });

    /**
     * Tests when a custom scanning directory is provided.
     * Paths are resolved relative to the given directory.
     *
     * `path.join` is used in assertions to ensure
     * cross-platform compatibility.
     */
    describe("when `env` dir is provided", () => {
      test("no env file is at the env dir", () => {
        const filepath = availableEnvFile({
          scriptName: "dev",
          scanningDir: "../custom-dir",
        });

        expect(filepath).toBe(null);
      });

      test("4 env files present", () => {
        vol.fromJSON(
          {
            ".env.development.local": "",
            ".env.development": "",
            ".env.local": "",
            ".env": "",
          },
          "../custom-dir"
        );

        const filepath = availableEnvFile({
          scriptName: "dev",
          scanningDir: "../custom-dir",
        });

        expect(filepath).toBe(
          path.join("../custom-dir", ".env.development.local")
        );
      });

      test("3 env files present", () => {
        vol.fromJSON(
          {
            ".env.development": "",
            ".env.local": "",
            ".env": "",
          },
          "../custom-dir"
        );

        const filepath = availableEnvFile({
          scriptName: "dev",
          scanningDir: "../custom-dir",
        });

        expect(filepath).toBe(path.join("../custom-dir", ".env.development"));
      });

      test("2 env files present", () => {
        vol.fromJSON(
          {
            ".env.local": "",
            ".env": "",
          },
          "../custom-dir"
        );

        const filepath = availableEnvFile({
          scriptName: "dev",
          scanningDir: "../custom-dir",
        });

        expect(filepath).toBe(path.join("../custom-dir", ".env.local"));
      });

      test("1 env file present", () => {
        vol.fromJSON({ ".env": "" }, "../custom-dir");

        const filepath = availableEnvFile({
          scriptName: "dev",
          scanningDir: "../custom-dir",
        });

        expect(filepath).toBe(path.join("../custom-dir", ".env"));
      });
    });
  });

  /**
   * Environment resolution behavior for the `build` script.
   *
   * Priority order:
   * .env.production.local
   * .env.production
   * .env.local
   * .env
   */
  describe("for `build` script", () => {
    describe("when `env` dir is not provided", () => {
      test("no env file is present at the root", () => {
        const filepath = availableEnvFile({ scriptName: "build" });
        expect(filepath).toBe(null);
      });

      test("4 env files present", () => {
        vol.fromJSON({
          ".env.production.local": "",
          ".env.production": "",
          ".env.local": "",
          ".env": "",
        });

        const filepath = availableEnvFile({ scriptName: "build" });
        expect(filepath).toBe(".env.production.local");
      });

      test("3 env files present", () => {
        vol.fromJSON({
          ".env.production": "",
          ".env.local": "",
          ".env": "",
        });

        const filepath = availableEnvFile({ scriptName: "build" });
        expect(filepath).toBe(".env.production");
      });

      test("2 env files present", () => {
        vol.fromJSON({
          ".env.local": "",
          ".env": "",
        });

        const filepath = availableEnvFile({ scriptName: "build" });
        expect(filepath).toBe(".env.local");
      });

      test("1 env file present", () => {
        vol.fromJSON({ ".env": "" });

        const filepath = availableEnvFile({ scriptName: "build" });
        expect(filepath).toBe(".env");
      });
    });

    describe("when `env` dir is provided", () => {
      test("no env file is at the env dir", () => {
        const filepath = availableEnvFile({
          scriptName: "build",
          scanningDir: "../custom-dir",
        });

        expect(filepath).toBe(null);
      });

      test("4 env files present", () => {
        vol.fromJSON(
          {
            ".env.production.local": "",
            ".env.production": "",
            ".env.local": "",
            ".env": "",
          },
          "../custom-dir"
        );

        const filepath = availableEnvFile({
          scriptName: "build",
          scanningDir: "../custom-dir",
        });

        expect(filepath).toBe(
          path.join("../custom-dir", ".env.production.local")
        );
      });

      test("3 env files present", () => {
        vol.fromJSON(
          {
            ".env.production": "",
            ".env.local": "",
            ".env": "",
          },
          "../custom-dir"
        );

        const filepath = availableEnvFile({
          scriptName: "build",
          scanningDir: "../custom-dir",
        });

        expect(filepath).toBe(path.join("../custom-dir", ".env.production"));
      });

      test("2 env files present", () => {
        vol.fromJSON(
          {
            ".env.local": "",
            ".env": "",
          },
          "../custom-dir"
        );

        const filepath = availableEnvFile({
          scriptName: "build",
          scanningDir: "../custom-dir",
        });

        expect(filepath).toBe(path.join("../custom-dir", ".env.local"));
      });

      test("1 env file present", () => {
        vol.fromJSON({ ".env": "" }, "../custom-dir");

        const filepath = availableEnvFile({
          scriptName: "build",
          scanningDir: "../custom-dir",
        });

        expect(filepath).toBe(path.join("../custom-dir", ".env"));
      });
    });
  });

  /**
   * Environment resolution behavior for the `test` script.
   *
   * Priority order:
   * .env.test.local
   * .env.test
   * .env.local
   * .env
   */
  describe("for `test` script", () => {
    describe("when `env` dir is not provided", () => {
      test("no env file is present at the root", () => {
        const filepath = availableEnvFile({ scriptName: "test" });
        expect(filepath).toBe(null);
      });

      test("4 env files present", () => {
        vol.fromJSON({
          ".env.test.local": "",
          ".env.test": "",
          ".env.local": "",
          ".env": "",
        });

        const filepath = availableEnvFile({ scriptName: "test" });
        expect(filepath).toBe(".env.test.local");
      });

      test("3 env files present", () => {
        vol.fromJSON({
          ".env.test": "",
          ".env.local": "",
          ".env": "",
        });

        const filepath = availableEnvFile({ scriptName: "test" });
        expect(filepath).toBe(".env.test");
      });

      test("2 env files present", () => {
        vol.fromJSON({
          ".env.local": "",
          ".env": "",
        });

        const filepath = availableEnvFile({ scriptName: "test" });
        expect(filepath).toBe(".env.local");
      });

      test("1 env file present", () => {
        vol.fromJSON({ ".env": "" });

        const filepath = availableEnvFile({ scriptName: "test" });
        expect(filepath).toBe(".env");
      });
    });

    describe("when `env` dir is provided", () => {
      test("no env file is at the env dir", () => {
        const filepath = availableEnvFile({
          scriptName: "test",
          scanningDir: "../custom-dir",
        });

        expect(filepath).toBe(null);
      });

      test("4 env files present", () => {
        vol.fromJSON(
          {
            ".env.test.local": "",
            ".env.test": "",
            ".env.local": "",
            ".env": "",
          },
          "../custom-dir"
        );

        const filepath = availableEnvFile({
          scriptName: "test",
          scanningDir: "../custom-dir",
        });

        expect(filepath).toBe(path.join("../custom-dir", ".env.test.local"));
      });

      test("3 env files present", () => {
        vol.fromJSON(
          {
            ".env.test": "",
            ".env.local": "",
            ".env": "",
          },
          "../custom-dir"
        );

        const filepath = availableEnvFile({
          scriptName: "test",
          scanningDir: "../custom-dir",
        });

        expect(filepath).toBe(path.join("../custom-dir", ".env.test"));
      });

      test("2 env files present", () => {
        vol.fromJSON(
          {
            ".env.local": "",
            ".env": "",
          },
          "../custom-dir"
        );

        const filepath = availableEnvFile({
          scriptName: "test",
          scanningDir: "../custom-dir",
        });

        expect(filepath).toBe(path.join("../custom-dir", ".env.local"));
      });

      test("1 env file present", () => {
        vol.fromJSON({ ".env": "" }, "../custom-dir");

        const filepath = availableEnvFile({
          scriptName: "test",
          scanningDir: "../custom-dir",
        });

        expect(filepath).toBe(path.join("../custom-dir", ".env"));
      });
    });
  });

  /**
   * Environment resolution behavior for custom scripts.
   *
   * Priority order:
   * .env.local
   * .env
   */
  describe("for `custom` script", () => {
    describe("when `env` dir is not provided", () => {
      test("no env file is present at the root", () => {
        const filepath = availableEnvFile({ scriptName: "custom-name" });
        expect(filepath).toBe(null);
      });

      test("2 env files present", () => {
        vol.fromJSON({
          ".env.local": "",
          ".env": "",
        });

        const filepath = availableEnvFile({ scriptName: "custom-name" });
        expect(filepath).toBe(".env.local");
      });

      test("1 env file present", () => {
        vol.fromJSON({ ".env": "" });

        const filepath = availableEnvFile({ scriptName: "custom-name" });
        expect(filepath).toBe(".env");
      });
    });

    describe("when `env` dir is provided", () => {
      test("no env file is at the env dir", () => {
        const filepath = availableEnvFile({
          scriptName: "custom-name",
          scanningDir: "../custom-dir",
        });

        expect(filepath).toBe(null);
      });

      test("2 env files present", () => {
        vol.fromJSON(
          {
            ".env.local": "",
            ".env": "",
          },
          "../custom-dir"
        );

        const filepath = availableEnvFile({
          scriptName: "custom-name",
          scanningDir: "../custom-dir",
        });

        expect(filepath).toBe(path.join("../custom-dir", ".env.local"));
      });

      test("1 env file present", () => {
        vol.fromJSON({ ".env": "" }, "../custom-dir");

        const filepath = availableEnvFile({
          scriptName: "custom-name",
          scanningDir: "../custom-dir",
        });

        expect(filepath).toBe(path.join("../custom-dir", ".env"));
      });
    });
  });
});

/**
 * Test suite for `extractCliOptions`.
 *
 * These tests verify that CLI arguments are correctly:
 * - Parsed into known CLI options (`cliOptions`)
 * - Separated from arbitrary / unknown arguments (`arbitaryCliArgumets`)
 *
 * The test cases cover both:
 * - Predefined scripts (e.g. `build`)
 * - Custom scripts invoked via `run <script-name>`
 *
 * Each scenario validates behavior when:
 * - No CLI options are provided
 * - CLI options are provided
 * - Arbitrary arguments are present or absent
 *
 * Supported CLI option formats validated by this suite:
 * - `-c <value>`
 * - `--config <value>`
 *
 * The expected behavior is:
 * - `cliOptions` is `undefined` when no known options are provided
 * - Known options are extracted and removed from arbitrary arguments
 * - Unknown flags are preserved as arbitrary arguments
 */

describe("extractCliOptions returns correct result", () => {
  describe("with predefined script", () => {
    test("cliOptions is undefined and no arbitary argument", () => {
      const res = extractCliOptions(["build"]);
      expect(res).toEqual({
        cliOptions: undefined,
        arbitaryCliArgumets: [],
      });
    });

    test("cliOptions is undefined and have arbitary argument", () => {
      const res = extractCliOptions(["build", "--some", "value"]);
      expect(res).toEqual({
        cliOptions: undefined,
        arbitaryCliArgumets: ["--some", "value"],
      });
    });

    test("cliOptions is present and no arbitary argument", () => {
      const res = extractCliOptions(["build", "-c", "../config"]);

      expect(res).toEqual({
        cliOptions: { configFileLocation: "../config" },
        arbitaryCliArgumets: [],
      });
    });

    test("cliOptions is present and with arbitary argument", () => {
      const res = extractCliOptions([
        "build",
        "-c",
        "../config",
        "--some",
        "value",
      ]);

      expect(res).toEqual({
        cliOptions: { configFileLocation: "../config" },
        arbitaryCliArgumets: ["--some", "value"],
      });
    });
  });

  describe("with custom script", () => {
    test("cliOptions is undefined and no arbitary argument", () => {
      const res = extractCliOptions(["run", "some-command"]);
      expect(res).toEqual({
        cliOptions: undefined,
        arbitaryCliArgumets: [],
      });
    });

    test("cliOptions is undefined and have arbitary argument", () => {
      const res = extractCliOptions(["run", "some-command", "--some", "value"]);
      expect(res).toEqual({
        cliOptions: undefined,
        arbitaryCliArgumets: ["--some", "value"],
      });
    });

    test("cliOptions is present and no arbitary argument", () => {
      const res = extractCliOptions(["run", "some-command", "-c", "../config"]);

      expect(res).toEqual({
        cliOptions: { configFileLocation: "../config" },
        arbitaryCliArgumets: [],
      });
    });

    test("cliOptions is present and with arbitary argument", () => {
      const res = extractCliOptions([
        "run",
        "some-command",
        "-c",
        "../config",
        "--some",
        "value",
      ]);

      expect(res).toEqual({
        cliOptions: { configFileLocation: "../config" },
        arbitaryCliArgumets: ["--some", "value"],
      });
    });
  });
});

/**
 * Test suite for `extractScriptRelatedCliOptions`.
 *
 * Purpose:
 * - Extract only CLI arguments that are relevant to a specific script
 * - Ignore global or unrelated CLI options (e.g. config file location)
 * - Correctly resolve both built-in scripts (`dev`) and custom scripts
 */
describe("extract cli arguments which needed for script", () => {
  /**
   * Tests for the built-in `dev` script.
   */
  describe("for `dev` script", () => {
    /**
     * Scenario:
     * The `dev` script is executed with a config-related argument (`-c`)
     * which should NOT be considered script-specific.
     *
     * Expected:
     * - The `dev` key exists in the result
     * - No script-related options are extracted
     * - `configFileLocation` is explicitly excluded
     */
    test("when no cli argument is not provided", () => {
      const res = extractScriptRelatedCliOptions([
        "dev",
        "-c",
        "../config-location",
      ]);

      expect(res).toEqual({ dev: {} });
      expect(Object.keys(res.dev)).not.toContain("configFileLocation");
    });

    /**
     * Scenario:
     * The `dev` script is executed with environment-related CLI arguments.
     *
     * Expected:
     * - Only script-related options (`envFile`, `envDir`) are extracted
     * - Options are grouped under the `dev` script key
     * - `configFileLocation` is not included
     */
    test("when cli argument is provided", () => {
      const res = extractScriptRelatedCliOptions([
        "dev",
        "--envFile",
        ".env.local",
        "--envDir",
        "../../",
      ]);

      expect(res).toEqual({
        dev: {
          envFile: ".env.local",
          envDir: "../../",
        },
      });
      expect(Object.keys(res.dev)).not.toContain("configFileLocation");
    });
  });

  /**
   * Tests for a custom user-defined script.
   *
   * Custom scripts are invoked via:
   * `run <script-name>`
   */
  describe("for custom script", () => {
    /**
     * Scenario:
     * A custom script is executed with only a config-related argument.
     *
     * Expected:
     * - The custom script name is used as the key
     * - No script-related options are extracted
     * - `configFileLocation` is ignored
     */
    test("when no cli argument is not provided", () => {
      const res = extractScriptRelatedCliOptions([
        "run",
        "custom-script",
        "-c",
        "../config-location",
      ]);

      expect(res).toEqual({ "custom-script": {} });
      expect(Object.keys(res["custom-script"])).not.toContain(
        "configFileLocation"
      );
    });

    /**
     * Scenario:
     * A custom script is executed with environment-related CLI arguments.
     *
     * Expected:
     * - Script-related options are correctly extracted
     * - Options are grouped under the custom script name
     * - Global config options are excluded
     */
    test("when cli argument is provided", () => {
      const res = extractScriptRelatedCliOptions([
        "run",
        "custom-script",
        "--envFile",
        ".env.local",
        "--envDir",
        "../../",
      ]);

      expect(res).toEqual({
        "custom-script": {
          envFile: ".env.local",
          envDir: "../../",
        },
      });
      expect(Object.keys(res["custom-script"])).not.toContain(
        "configFileLocation"
      );
    });
  });
});
