#!/usr/bin/env node

process.on("unhandledRejection", err => {
  throw err;
});

const args = process.argv.slice(2);

if (args[0] !== "build")
  throw new Error("Unknown script " + args[0]);

require("../scripts/build");
