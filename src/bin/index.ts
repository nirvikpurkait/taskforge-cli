import {
  arbitaryArgumets,
  finalConfig,
  loadEnvFile,
  scriptName,
} from "@/utils";
import { spawn } from "node:child_process";

loadEnvFile();

if (finalConfig?.scripts?.[scriptName]?.execute) {
  const executableCommand =
    finalConfig?.scripts?.[scriptName]?.execute.split(" ")!;

  const executable = executableCommand[0];

  const command = executableCommand.slice(1).concat(arbitaryArgumets);

  const process = spawn(executable, command, {
    stdio: "inherit",
    shell: true,
  });

  // Optional: listen for exit
  process.on("exit", (code, signal) => {
    console.log(`Process exited with code ${code}, signal ${signal}`);
  });
}
