const fs = require("fs");

function bias(path) {
  const projectPath = process.cwd() + "/" + path;
  return fs.existsSync(projectPath) ? projectPath : __dirname + "/" + path;
}

module.exports = {
  bias,
};
