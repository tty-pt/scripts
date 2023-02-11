const { spawn } = require("node:child_process");

function cexec(cmd, nodeArgs) {
  let args = cmd.split(' ');
  const path = args.shift();
  const child = spawn(path, nodeArgs ? args.concat(nodeArgs) : args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PATH: process.env.PATH + ":" + process.cwd() + "/node_modules/.bin:" + __dirname + "/node_modules/.bin",
      NODE_PATH: process.cwd() + "/node_modules:" + __dirname + "/node_modules",
      __dirname,
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
