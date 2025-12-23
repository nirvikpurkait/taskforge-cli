import { mkdtempSync, rmSync } from "node:fs";
import child_process from "node:child_process";
import path from "node:path";
import { chdir, cwd } from "node:process";
import { after, before } from "node:test";

let tempDir: string;
let srcDir: string;
let testDir: string;

before(() => {
  executeCommand("npm link");

  tempDir = mkdtempSync(path.join(cwd(), "../", "taskforge-cli-test-"));
  srcDir = cwd();
  testDir = tempDir;
  chdir(tempDir);

  executeCommand("npm link taskforge-cli");
});

after(() => {
  chdir(path.join(tempDir, "../taskforge-cli"));

  executeCommand("npm un taskforge-cli -g");

  rmSync(tempDir, { force: true, recursive: true });
});

function executeCommand(command: string) {
  child_process.execSync(command, {
    stdio: ["inherit", "pipe", "pipe"],
  });
}
