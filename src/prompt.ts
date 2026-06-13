import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export async function promptProjectName(): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    return (await rl.question("Project name: ")).trim();
  } finally {
    rl.close();
  }
}
