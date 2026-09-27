import { inspectFf18Prerequisites } from "./lib/ff18-prerequisites.js";

const result = await inspectFf18Prerequisites(process.cwd());

console.log(JSON.stringify(result, null, 2));

if (!result.readyForBenchmarkDecision) {
  process.exitCode = 2;
}
