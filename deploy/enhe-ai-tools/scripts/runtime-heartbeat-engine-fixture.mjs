import { createInterface } from "node:readline";

const input = createInterface({ input: process.stdin });
let released = false;

console.log("READY");

input.on("line", (command) => {
  if (command === "HOLD") {
    console.log("HOLD_ACK");
    return;
  }
  if (command === "RELEASE") {
    if (released) return;
    released = true;
    console.log("RELEASE_ACK");
    input.close();
    process.stdin.destroy();
    process.stdout.end(() => process.exit(0));
    return;
  }
  if (command === "ABORT") {
    console.log("ABORT_ACK");
    input.close();
    process.stdin.destroy();
    process.stdout.end(() => process.exit(1));
  }
});
