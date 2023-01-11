const { cexec } = require("../cexec");
const package = require(process.cwd() + "/package.json");

// const args = Object.entries(package.peerDependencies)
//   .map(([key, value]) => key + "@" + value.substr(1))
//   .join(' ');

const args = Object.keys(package.peerDependencies).join(" ");

console.log("npm i " + args);
cexec("npm i " + args);
