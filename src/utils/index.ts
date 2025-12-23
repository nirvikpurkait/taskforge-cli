import { createJiti } from "jiti";
import { argv } from "node:process";
import { config } from "dotenv";
import path from "node:path";
import { existsSync, statSync } from "node:fs";
import {
  developmentEnvFileLoadingOrder,
  productionEnvFileLoadingOrder,
  testEnvFileLoadingOrder,
  validConfigFilesOrder,
} from "@/utils/const";
import { Config, configSchema, ScriptDetails, Scripts } from "@/config/config";

// just take only the necessary portion of the argv
export const passedArguments = argv.slice(2);

// what type of script is running
function identifyScript(): "dev" | "build" | "test" | (string & {}) {
  if (passedArguments.includes("dev")) {
    return "dev";
  } else if (passedArguments.includes("build")) {
    return "build";
  } else if (passedArguments.includes("test")) {
    return "test";
  } else if (passedArguments.includes("custom")) {
    return passedArguments[
      passedArguments.findIndex((value) => value === "custom") + 1
    ];
  } else
    throw new Error(
      'No script is passed.\nIf you have a custom scripts other than predefined scripts use "tf custom <script-name>".\nRemember the script name must be next to the custom keyword'
    );
}

// identify which script is running
export const scriptName = identifyScript();

export function loadEnvFile() {
  let envFilePath: string | undefined;

  if (scriptName === "dev") {
    envFilePath = availableFile(
      developmentEnvFileLoadingOrder,
      finalConfig?.envDir ?? finalConfig?.scripts?.dev?.envDir ?? process.cwd()
    );

    if (finalConfig?.scripts?.dev?.envFile) {
      envFilePath = finalConfig.scripts.dev.envFile;
    }
  } else if (scriptName === "build") {
    envFilePath = availableFile(
      productionEnvFileLoadingOrder,
      finalConfig?.envDir ??
        finalConfig?.scripts?.build?.envDir ??
        process.cwd()
    );

    if (finalConfig?.scripts?.build?.envFile) {
      envFilePath = finalConfig.scripts.build.envFile;
    }
  } else if (scriptName === "test") {
    envFilePath = availableFile(
      testEnvFileLoadingOrder,
      finalConfig?.envDir ?? finalConfig?.scripts?.test?.envDir ?? process.cwd()
    );

    if (finalConfig?.scripts?.test?.envFile) {
      envFilePath = finalConfig.scripts.test.envFile;
    }
  }
  // custom script name
  else {
    envFilePath = path.join(
      finalConfig?.envDir ??
        finalConfig?.scripts?.[scriptName]?.envDir ??
        process.cwd(),
      ".env"
    );

    if (finalConfig?.scripts?.[scriptName]?.envFile) {
      envFilePath = finalConfig.scripts?.[scriptName].envFile;
    }
  }

  if (
    !envFilePath ||
    !existsSync(envFilePath) ||
    !statSync(envFilePath).isFile()
  ) {
    console.log(`No env file detected.\nSkipping loading env variables`);
    return;
  }

  // add node env into env variable depending on the script type
  process.env.NODE_ENV =
    scriptName === "dev"
      ? "development"
      : scriptName === "build"
        ? "production"
        : scriptName === "test"
          ? "test"
          : undefined;

  // configure env
  config({ path: envFilePath, quiet: true, override: true });
}

// pick the most preferred file from the list
export function availableFile(fileOrder: string[], scanningDir: string) {
  return fileOrder
    .map((f) => path.join(scanningDir, f))
    .find((f) => existsSync(f));
}

// type of cli options that can be passed through cli
type CliOptions =
  | {
      configFileLocation?: string;
      envFile?: string;
      execute?: string;
      envDir?: string;
    }
  | undefined;

// unnecessary arguments that are passed to the script
export const arbitaryArgumets: string[] = [];

// create an object extracting the options for using later
function extractCliOptions(): CliOptions {
  let cliOptions: CliOptions = {};

  passedArguments.forEach((arg, idx) => {
    // if arg is not predefined or custom argument assume them as a arbitary argument as long not being sure
    if (!(arg === scriptName || arg === ("custom" as string))) {
      arbitaryArgumets.push(arg);
    }

    // extract configuration
    if (arg === "-c" || arg === "--config") {
      cliOptions.configFileLocation = passedArguments[idx + 1];
      // assured last added argument is valid argument so remove it
      arbitaryArgumets.pop();
    }
    if (arg.startsWith("-c=") || arg.startsWith("--config=")) {
      cliOptions.configFileLocation = arg.split("=")[1];
      // assured last added argument is valid argument so remove it
      arbitaryArgumets.pop();
    }

    // extract env file location
    if (arg === "--envFile") {
      cliOptions.envFile = passedArguments[idx + 1];
      // assured last added argument is valid argument so remove it
      arbitaryArgumets.pop();
    }
    if (arg.startsWith("--envFile=")) {
      cliOptions.envFile = arg.split("=")[1];
      // assured last added argument is valid argument so remove it
      arbitaryArgumets.pop();
    }

    // extract env directory location
    if (arg === "--envDir") {
      cliOptions.envDir = passedArguments[idx + 1];
      // assured last added argument is valid argument so remove it
      arbitaryArgumets.pop();
    }
    if (arg.startsWith("--envDir=")) {
      cliOptions.envDir = arg.split("=")[1];
      // assured last added argument is valid argument so remove it
      arbitaryArgumets.pop();
    }

    // extract executing script
    if (arg === "--exec") {
      cliOptions.execute = passedArguments[idx + 1];
      // assured last added argument is valid argument so remove it
      arbitaryArgumets.pop();
    }
    if (arg.startsWith("--exec=")) {
      cliOptions.execute = arg.split("=")[1];
      // assured last added argument is valid argument so remove it
      arbitaryArgumets.pop();
    }
  });

  if (Object.keys(cliOptions).length === 0) {
    return undefined;
  }

  return cliOptions;
}

// store the cli options
export const cliOptions = extractCliOptions();

// only cli options that are needed for script details overriding by cli option
const scriptRelatedCliOptions = { ...cliOptions };
// delete configFileLocation as not needed
delete scriptRelatedCliOptions?.configFileLocation;

type FilteredScriptDetails = Partial<ScriptDetails>;

// configuration from cli for the script
export const configurationFromCliOption: Record<string, FilteredScriptDetails> =
  {
    [scriptName]: { ...scriptRelatedCliOptions },
  };

// extract configuration file content
function executeConfigFile() {
  const determinedConfigFileLocation =
    cliOptions?.configFileLocation ??
    availableFile(validConfigFilesOrder, process.cwd());

  if (!determinedConfigFileLocation) {
    console.log("No config file found");
    return;
  }

  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
  });

  const moduleFromConfigFile = jiti(path.resolve(determinedConfigFileLocation));

  const config = moduleFromConfigFile?.default ?? moduleFromConfigFile;

  const parsedConfig = configSchema.safeParse(config);

  if (!parsedConfig.success) {
    throw new Error("Something is wrong with config file. Please correct it");
  }

  return parsedConfig.data;
}

// configuration file content
export const configurationFromConfigFile = executeConfigFile();

// separate script details from config file to merge with cli options
export const scriptsDetailsFromConfigFile =
  configurationFromConfigFile?.scripts;

// separate script details from cli optins to merge with config file
const scriptsFromConfig: Record<string, ScriptDetails> =
  scriptsDetailsFromConfigFile ?? {};

// merged cli options with config file options
export const mergedScriptDetails: Scripts = {
  ...scriptsFromConfig,
  [scriptName]: {
    ...(scriptsFromConfig[scriptName] ?? {}),
    ...scriptRelatedCliOptions,
  },
};

// final config after merging cli options with config file options
export const finalConfig: Config = {
  ...configurationFromConfigFile,
  scripts: { ...mergedScriptDetails },
};
