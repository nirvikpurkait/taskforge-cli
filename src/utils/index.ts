import path from "node:path";
import {
  defaultEnvFileLoadingOrder,
  developmentEnvFileLoadingOrder,
  productionEnvFileLoadingOrder,
  testEnvFileLoadingOrder,
  validConfigFilesOrder,
} from "./const";
import { existsSync } from "node:fs";
import { configSchema, ScriptDetails } from "@/config/config";
import { createJiti } from "jiti";

/**
 * Identifies the script name by analysing CLI arguments.
 *
 * The function checks for predefined scripts (`dev`, `build`, `test`) first.
 * If none are found, it looks for a `run` keyword and returns the argument
 * immediately following it as a custom script name.
 *
 * @param {string[]} passedArguments - The list of CLI arguments to inspect.
 *
 * @returns {"dev" | "build" | "test" | string}
 * Returns:
 * - `"dev"` if `dev` is present
 * - `"build"` if `build` is present
 * - `"test"` if `test` is present
 * - A custom script name if `run <script-name>` is provided
 *
 * @throws
 * Throws:
 * `Error` if no valid script is found or if `run` is provided without a
 * following script name.
 *
 * @example
 * identifyScript(["dev"]);
 * // → "dev"
 *
 * @example
 * identifyScript(["run", "lint"]);
 * // → "lint"
 */
export function identifyScript(
  passedArguments: string[]
): "dev" | "build" | "test" | (string & {}) {
  if (passedArguments.includes("dev")) {
    return "dev";
  } else if (passedArguments.includes("build")) {
    return "build";
  } else if (passedArguments.includes("test")) {
    return "test";
  } else if (passedArguments.includes("run")) {
    return passedArguments[
      passedArguments.findIndex((value) => value === "run") + 1
    ];
  } else
    throw new Error(
      'No script is passed.\nIf you have a custom scripts other than predefined scripts use "tf run <script-name>".\nRemember, the script name must be next to the `run` keyword'
    );
}

/**
 * Options used to resolve the most appropriate `.env` file.
 */
type AvailableEnvFileOptiions = {
  /**
   * Directory to scan for environment files.
   * If omitted, files are resolved relative to the project root.
   */
  scanningDir?: string;

  /**
   * Name of the script being executed.
   * Used to determine the env file loading priority.
   */
  scriptName: ReturnType<typeof identifyScript>;
};

/**
 * Resolves the most appropriate environment file based on the script name
 * and an optional scanning directory.
 *
 * The function selects a predefined loading order depending on the script:
 * - `dev`   → development env files
 * - `build` → production env files
 * - `test`  → test env files
 * - others  → default env files
 *
 * Files are checked in priority order, and the first existing file is returned.
 *
 * @param {AvailableEnvFileOptiions} options - Configuration for env file resolution.
 *
 * @returns {string | null}
 * The full path to the resolved env file, or `null` if none exist.
 */
export function availableEnvFile({
  scriptName,
  scanningDir,
}: AvailableEnvFileOptiions): string | null {
  // If no scanning directory is provided, resolve relative to root
  if (!scanningDir) {
    if (scriptName === "dev") {
      return resolveEnvFile(developmentEnvFileLoadingOrder, "");
    }
    if (scriptName === "build") {
      return resolveEnvFile(productionEnvFileLoadingOrder, "");
    }
    if (scriptName === "test") {
      return resolveEnvFile(testEnvFileLoadingOrder, "");
    }
    return resolveEnvFile(defaultEnvFileLoadingOrder, "");
  }

  // Resolve env files within the provided scanning directory
  if (scriptName === "dev") {
    return resolveEnvFile(developmentEnvFileLoadingOrder, scanningDir);
  }
  if (scriptName === "build") {
    return resolveEnvFile(productionEnvFileLoadingOrder, scanningDir);
  }
  if (scriptName === "test") {
    return resolveEnvFile(testEnvFileLoadingOrder, scanningDir);
  }
  return resolveEnvFile(defaultEnvFileLoadingOrder, scanningDir);

  /**
   * Iterates over a prioritized list of env files and returns
   * the first file that exists on disk.
   *
   * @param {string[]} fileOrder - Ordered list of env file names to check.
   * @param {string} dir - Directory in which to resolve the files.
   *
   * @returns {string | null}
   * The full path of the first existing env file, or `null` if none are found.
   */
  function resolveEnvFile(fileOrder: string[], dir: string): string | null {
    for (const file of fileOrder) {
      const fullPath = path.join(dir, file);

      if (existsSync(fullPath)) {
        return fullPath;
      }
    }

    return null;
  }
}

/**
 * Represents CLI options that can be extracted from command-line arguments.
 *
 * - All properties are optional because users may pass only a subset.
 * - When no CLI options are provided, the value will be `undefined`.
 */
export type CliOptions =
  | ({
      /** Path to a custom configuration file */
      configFileLocation?: string;
    } & Partial<ScriptDetails>)
  | undefined;

/**
 * Extracts known CLI options from the provided arguments while separating
 * unknown or unsupported arguments as arbitrary CLI arguments.
 *
 * ## Responsibilities
 * - Identify predefined or custom scripts (e.g. `build`, `run some-command`)
 * - Extract supported CLI flags (e.g. `-c`, `--config`, `--envFile`, etc.)
 * - Preserve unrecognized flags and values as arbitrary arguments
 *
 * ## Supported formats
 * - `--flag value`
 * - `--flag=value`
 * - `-c value`
 *
 * ## Return behavior
 * - If no known CLI options are found, `cliOptions` will be `undefined`
 *
 * @param passedArguments - Raw CLI arguments (excluding node and script path)
 *
 * @returns An object containing:
 * - `cliOptions`: extracted known options or `undefined`
 * - `arbitaryCliArgumets`: remaining arguments not consumed by known options
 */
export function extractCliOptions(passedArguments: string[]): {
  cliOptions: CliOptions;
  arbitaryCliArgumets: string[];
} {
  /** Holds arguments that are not recognized as known CLI options */
  const arbitaryCliArgumets: string[] = [];
  /** Script name inferred from passed arguments (predefined or custom) */
  const scriptName = identifyScript(passedArguments);
  /**
   * Indicates whether the next argument should be skipped because
   * it is a value for a previously processed option (e.g. `-c value`)
   */
  let shouldSkipNextArgument = false;

  let cliOptions: CliOptions = {};

  passedArguments.forEach((arg, idx) => {
    /**
     * Treat arguments as arbitrary unless they are:
     * - the identified script name
     * - the `run` keyword
     * - or consumed later by a known option
     */
    if (!(arg === scriptName || arg === ("run" as string))) {
      arbitaryCliArgumets.push(arg);
      if (shouldSkipNextArgument) {
        arbitaryCliArgumets.pop();
        shouldSkipNextArgument = !shouldSkipNextArgument;
      }
    }

    /**
     * -----------------------------
     * Config file location
     * -----------------------------
     */

    /**
     * extract configuration
     * it can take `-c` or `--config` as arguments
     */
    if (arg === "-c" || arg === "--config") {
      cliOptions.configFileLocation = passedArguments[idx + 1];
      /**
       * assured that `-c` or `--config` argument is valid argument
       * remove it from arbitary arguments list
       */
      arbitaryCliArgumets.pop();
      shouldSkipNextArgument = true;
    }
    /**
     * extract configuration
     * it can take `-c` or `--config` as arguments
     */
    if (arg.startsWith("-c=") || arg.startsWith("--config=")) {
      cliOptions.configFileLocation = arg.split("=")[1];
      /**
       * assured that `-c` or `--config` argument is valid argument
       * remove it from arbitary arguments list
       */
      arbitaryCliArgumets.pop();
    }

    /**
     * -----------------------------
     * Environment file
     * -----------------------------
     */

    /**
     * extract configuration
     * it can take `--envFile` as arguments
     */
    if (arg === "--envFile") {
      cliOptions.envFile = passedArguments[idx + 1];
      /**
       * assured that `--envFile` argument is valid argument
       * remove it from arbitary arguments list
       */
      arbitaryCliArgumets.pop();
      shouldSkipNextArgument = true;
    }
    /**
     * extract configuration
     * it can take `--envFile` as arguments
     */
    if (arg.startsWith("--envFile=")) {
      cliOptions.envFile = arg.split("=")[1];
      /**
       * assured that `--envFile` argument is valid argument
       * remove it from arbitary arguments list
       */
      arbitaryCliArgumets.pop();
    }

    /**
     * -----------------------------
     * Environment directory
     * -----------------------------
     */

    /**
     * extract configuration
     * it can take `--envDir` as arguments
     */
    if (arg === "--envDir") {
      cliOptions.envDir = passedArguments[idx + 1];
      /**
       * assured that `--envDir` argument is valid argument
       * remove it from arbitary arguments list
       */
      arbitaryCliArgumets.pop();
      shouldSkipNextArgument = true;
    }
    /**
     * extract configuration
     * it can take `--envDir` as arguments
     */
    if (arg.startsWith("--envDir=")) {
      cliOptions.envDir = arg.split("=")[1];
      /**
       * assured that `--envDir` argument is valid argument
       * remove it from arbitary arguments list
       */
      arbitaryCliArgumets.pop();
    }

    /**
     * -----------------------------
     * Execute command
     * -----------------------------
     */

    /**
     * extract configuration
     * it can take `--exec` as arguments
     */
    if (arg === "--exec") {
      cliOptions.execute = passedArguments[idx + 1];
      /**
       * assured that `--exec` argument is valid argument
       * remove it from arbitary arguments list
       */
      arbitaryCliArgumets.pop();
      shouldSkipNextArgument = true;
    }
    /**
     * extract configuration
     * it can take `--exec` as arguments
     */
    if (arg.startsWith("--exec=")) {
      cliOptions.execute = arg.split("=")[1];
      /**
       * assured that `--exec` argument is valid argument
       * remove it from arbitary arguments list
       */
      arbitaryCliArgumets.pop();
    }

    /**
     * -----------------------------
     * Shell execution
     * -----------------------------
     */

    /**
     * extract configuration
     * it can take `--shell` as arguments
     */
    if (arg === "--shell") {
      const passedArgument = passedArguments[idx + 1];

      if (passedArgument === "false") cliOptions.shell = false;
      if (passedArgument === "true") cliOptions.shell = true;
      cliOptions.execute = passedArgument;
      /**
       * assured that `--shell` argument is valid argument
       * remove it from arbitary arguments list
       */
      arbitaryCliArgumets.pop();
      shouldSkipNextArgument = true;
    }

    /**
     * extract configuration
     * it can take `--shell` as arguments
     */
    if (arg.startsWith("--shell=")) {
      const passedArgument = arg.split("=")[1];

      if (passedArgument === "false") cliOptions.shell = false;
      if (passedArgument === "true") cliOptions.shell = true;
      cliOptions.execute = passedArgument;
      /**
       * assured that `--shell` argument is valid argument
       * remove it from arbitary arguments list
       */
      arbitaryCliArgumets.pop();
    }
  });

  /**
   * If no CLI options were extracted, return `undefined`
   * to clearly indicate absence of configuration.
   */
  if (Object.keys(cliOptions).length === 0) {
    return { cliOptions: undefined, arbitaryCliArgumets };
  }

  return { cliOptions, arbitaryCliArgumets };
}

/**
 * Extracts CLI options that are **specifically related to a script**
 * and maps them to the identified script name.
 *
 * This function:
 * - Reuses `extractCliOptions` to parse all CLI options
 * - Removes options that are not script-specific (e.g. `configFileLocation`)
 * - Associates the remaining options with the detected script
 *
 * The resulting object is structured so it can be merged directly
 * into script configuration definitions.
 *
 * ## Example
 * ```ts
 * extractScriptRelatedCliOptions([
 *   "run",
 *   "build-app",
 *   "--envFile",
 *   ".env",
 * ])
 * // {
 * //   "build-app": {
 * //     envFile: ".env"
 * //   }
 * // }
 * ```
 *
 * @param passedArguments - Raw CLI arguments passed to the process
 *
 * @returns An object keyed by script name containing script-related CLI options
 */

export function extractScriptRelatedCliOptions(passedArguments: string[]) {
  /**
   * extract all cli options that are passed with the script
   * rename it for better readablity
   */
  const { cliOptions: cliOptionsPassedThroughScript } =
    extractCliOptions(passedArguments);

  /**
   * cliOptions is needed later, so create a copy of the cliOption and
   * later use that, delete `configFileLocation` as not needed
   */
  const scriptRelatedCliOptions = { ...cliOptionsPassedThroughScript };
  delete scriptRelatedCliOptions?.configFileLocation;

  /**
   * make every field optional
   */
  type FilteredScriptDetails = Partial<ScriptDetails>;
  /**
   * identify the script name and assign the scriptDetails.
   */
  const scriptName = identifyScript(passedArguments);

  const configurationFromCliOption: Record<string, FilteredScriptDetails> = {
    [scriptName]: { ...scriptRelatedCliOptions },
  };

  return configurationFromCliOption;
}

/**
 * Loads, resolves, and validates the configuration file for the application.
 *
 * The function determines the config file location by:
 * 1. Checking CLI-provided options
 * 2. Falling back to a predefined file order in the current working directory
 *
 * It then dynamically imports the config file, extracts the configuration
 * object, and validates it against the schema.
 *
 * @param {string[]} passedArguments - Raw CLI arguments passed to the process
 * @throws {Error} If the config file exists but fails schema validation
 */
export function executeConfigFile(passedArguments: string[]) {
  // Extract CLI options from passed arguments
  const { cliOptions } = extractCliOptions(passedArguments);

  // Determine config file location:
  // Prefer CLI option, otherwise search in CWD using the valid file order
  const determinedConfigFileLocation =
    cliOptions?.configFileLocation ??
    resolveConfigFile(validConfigFilesOrder, process.cwd());

  // Exit early if no config file could be found
  if (!determinedConfigFileLocation) {
    console.error("No config file found");
    return;
  }

  // Create a Jiti instance to support loading JS/TS config files
  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
  });

  // Dynamically import the configuration module
  const moduleFromConfigFile = jiti(path.resolve(determinedConfigFileLocation));

  // Support both default and named exports
  const config = moduleFromConfigFile?.default ?? moduleFromConfigFile;

  // Validate configuration against schema
  const parsedConfig = configSchema.safeParse(config);

  // Throw if validation fails
  if (!parsedConfig.success) {
    throw new Error("Something is wrong with config file. Please correct it");
  }

  // Return validated configuration data
  return parsedConfig.data;

  /**
   * Resolves the first existing config file from a prioritized list.
   *
   * @param {string[]} fileOrder - Ordered list of valid config filenames
   * @param {string} dir - Directory in which to search for config files
   */
  function resolveConfigFile(fileOrder: string[], dir: string) {
    for (const file of fileOrder) {
      const fullPath = path.join(dir, file);

      // Return the first config file that exists
      if (existsSync(fullPath)) {
        return fullPath;
      }
    }

    return null;
  }
}

/**
 * Builds the final configuration object by merging:
 * - config file values
 * - CLI arguments
 * - script-specific overrides
 *
 * @param {string[]} passedArguments - Raw CLI arguments
 */
export function finalizedConfigFromAllSources(passedArguments: string[]) {
  // Load configuration from the config file (if any)
  const configFromConfigFile = executeConfigFile(passedArguments);

  // Extract CLI options that are related specifically to scripts
  const scriptRelatedCliOptions =
    extractScriptRelatedCliOptions(passedArguments);

  // Get scripts defined in the config file, or fall back to an empty object
  const scriptsDetailsFromConfigFile =
    (configFromConfigFile && configFromConfigFile.scripts) || {};

  // Determine which script is being executed based on CLI args
  const scriptName = identifyScript(passedArguments);

  /**
   * Merge script config:
   * - start with scripts from config file
   * - override the selected script with CLI-provided options
   */

  const mergedScriptDetails = {
    ...scriptsDetailsFromConfigFile,
    [scriptName]: {
      ...(scriptsDetailsFromConfigFile[scriptName] || {}),
      ...scriptRelatedCliOptions,
    },
  };

  // Build the final config object
  // CLI script options override config file values
  const finalConfig = {
    ...configFromConfigFile,
    scripts: { ...mergedScriptDetails },
  };

  return finalConfig;
}
