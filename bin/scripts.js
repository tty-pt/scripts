#!/usr/bin/env node

const pkg = require(process.cwd() + "/package.json");
const { cexec } = require("../cexec");

process.on("unhandledRejection", err => {
  throw err;
});

function scriptCmd(path) {
  return function () {
    require("../scripts/" + path);
  };
}

const scripts = {
  // dist: "swc --copy-files -d dist src",
  build: (pkg.parser !== "swc"
    ? scriptCmd("build")
    : (pkg["@tty-pt/scripts"]?.library
      ? "swc --copy-files -d dist src"
      : scriptCmd("build") // TODO why custom script now?
    )
  ),
  types: scriptCmd("types"),
  watch: "swc src --copy-files -w --out-dir dist",
  // "watch-dev": "nodemon --watch \"dist/**/*\" -e js ./dist/main.js",
  start: scriptCmd("start"), // watch + watch-dev
  run: "NODE_ENV=production node dist/main.js",
  "install-peers": scriptCmd("install-peers"),
  test: "jest -c ./node_modules/@tty-pt/scripts/jest.config.json",
  lint: "eslint --format compact --ext .js,.jsx,.ts,.tsx src",
  init: __dirname + "/../scripts/init.sh",
  storybook: "s/storybook dev",
  "build-storyboook": "storybook build -s public",
  "install-peers": "jq -r .peerDependencies package.json | tail -n +2 | head -n -1 | sed 's/[\":^,]*//g' | awk '{ print $1 \"@\" $2 }'",
};

const args = process.argv.slice(2);
const scriptName = args[0];
const script = scripts[scriptName];

if (!script)
  throw new Error("Unknown script " + scriptName);

if (typeof script === "string")
  cexec(script.replace("$@", args.slice(1).join(" ")), args.slice(1));
else
  script();
