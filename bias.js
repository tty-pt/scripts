const fs = require("fs");

function bias(path) {
  const projectPath = process.cwd() + "/" + path;
  return fs.existsSync(projectPath) ? projectPath : "./" + path;
}

module.exports = {
  bias,
};
