const { spawn } = require("node:child_process");

function cexec(cmd) {
  // console.log("cexec", cmd);
  let args = cmd.split(' ');
  const path = args.shift();

  const child = spawn(path, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_PATH: process.cwd() + "/node_modules",
    },
    stdio: [process.stdin, process.stdout, process.stderr],
    encoding: "utf-8"
  });

  child.on("close", code => {
    process.exit(code);
  });

  return child;
}

module.exports = { cexec };
