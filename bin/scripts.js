#!/usr/bin/env node

const package = require(process.cwd() + "/package.json");
const { cexec } = require("../cexec");

process.on("unhandledRejection", err => {
  throw err;
});

function scriptCmd(path) {
  return process.execPath + ' ' + require.resolve("../scripts/" + path);
}

const scripts = {
  // dist: "swc --copy-files -d dist src",
  build: (package["@tty-pt/scripts"]?.library
    ? "swc --copy-files -d dist src"
    : scriptCmd("build") // TODO why custom script now?
  ),
  watch: "swc src --copy-files -w --out-dir dist",
  // "watch-dev": "nodemon --watch \"dist/**/*\" -e js ./dist/main.js",
  start: scriptCmd("start"), // watch + watch-dev
  run: "NODE_ENV=production node dist/main.js",
  "install-peers": scriptCmd("install-peers"),
  test: "node node_modules/@tty-pt/scripts/node_modules/jest/bin/jest.js",
  lint: "eslint --format compact --ext .js,.jsx,.ts,.tsx src",
  init: __dirname + "/../scripts/init.sh",
  storybook: "node node_modules/@tty-pt/scripts/node_modules/storybook dev",
  "build-storyboook": "node node_modules/@tty-pt/scripts/node_modules/storybook build -s public",
  "install-peers": "jq -r .peerDependencies package.json | tail -n +2 | head -n -1 | sed 's/[\":^,]*//g' | awk '{ print $1 \"@\" $2 }'",
};

const args = process.argv.slice(2);
const scriptName = args[0];
const script = scripts[scriptName];

if (!script)
  throw new Error("Unknown script " + scriptName);

cexec(script, args.slice(1));
