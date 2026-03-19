import {
  availableEnvFile,
  extractCliOptions,
  finalizedConfigFromAllSources,
  identifyScript,
} from "@/utils";
import { argv, cwd } from "node:process";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { spawn } from "node:child_process";

// CLI arguments excluding `node` and script path
export const passedArguments = argv.slice(2);

// Immediately-invoked function to execute the CLI logic
(() => {
  // Identify which script the user wants to run
  const scriptName = identifyScript(passedArguments);

  // Build the final configuration by merging all sources
  const finalConfig = finalizedConfigFromAllSources(passedArguments);

  // Extract arbitrary CLI arguments that should be forwarded to the script
  const { arbitaryCliArgumets } = extractCliOptions(passedArguments);

  // Determine which .env file should be loaded for this script
  const envFileToLoad = availableEnvFile({
    scriptName: scriptName,
    scanningDir: finalConfig.envDir,
    customEnvFile: finalConfig.scripts[scriptName]?.envFile,
  });

  // Warn if no env file was found
  if (!envFileToLoad) {
    console.error("No env file is provided");
  }

  // Load environment variables from the resolved env file
  loadEnv({
    path: path.join(cwd(), envFileToLoad || ""),
    quiet: true,
  });

  // Check if the selected script has an execute command
  if (finalConfig?.scripts?.[scriptName]?.execute) {
    // Split the execute command into executable and arguments
    const executableCommand =
      finalConfig.scripts[scriptName].execute.split(",");

    const executable = executableCommand[0];
    const commandArgs = executableCommand.slice(1).concat(arbitaryCliArgumets);

    const nodeEnv = finalConfig.scripts.build
      ? "production"
      : finalConfig.scripts.dev
        ? "development"
        : finalConfig.scripts.test
          ? "test"
          : undefined;

    // Spawn the child process
    const executingProcess = spawn(`${executable} ${commandArgs.join(" ")}`, {
      stdio: "inherit",
      // Use shell mode unless explicitly disabled in config
      shell: finalConfig.scripts[scriptName].shell ?? true,
      env: {
        NODE_ENV: nodeEnv ? nodeEnv : undefined,
        ...process.env,
        ...finalConfig.scripts[scriptName].envValues,
      },
    });

    // Log exit information for debugging purposes
    executingProcess.on("exit", (code: any, signal: any) => {
      console.log(`Process exited with code ${code}, signal ${signal}`);
    });
  }
})();
