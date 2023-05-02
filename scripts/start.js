const express = require("express");
const fs = require("fs");
const package = require(process.cwd() + "/package.json");
const port = 3030;

const app = express();

if (fs.existsSync("./src/setupProxy.js"))
  require(process.cwd() + "/src/setupProxy.js")(app);

app.use(express.static(process.cwd() + "/public"));

if (true) {
  const { webpack, makeConfig } = require("../webpack");
  const webpackHotMiddleware = require("webpack-hot-middleware");
  const webpackDevMiddleware = require("webpack-dev-middleware");

  const config = makeConfig({ development: true });

  const compiler = webpack(config);

  app.use(webpackDevMiddleware(compiler, {
    publicPath: config.output.publicPath,
  }));

  app.use(webpackHotMiddleware(compiler));
} else {
  const { spawn } = require('node:child_process');
  const swc = spawn('swc', ['src', '-w', '--out-dir', 'dist']);

  swc.stdout.on('data', (data) => console.log("" + data));
  swc.stderr.on('data', (data) => console.error("" + data));
  swc.on('close', (code) => console.log(`child process exited with code ${code}`));

  app.use(express.static(process.cwd() + "/dist"));
}

(package?.["@tty-pt/types"]?.serve || []).forEach(path => {
  app.use("/" + path, express.static(process.cwd() + "/" + path));
});

app.get("/*.html", (req, res) => {
  res.sendFile("/index.html", { root: "./" });
});

app.get("/*.js", (req, res) => {
  res.sendFile("./build/main.js", { root: "./" });
});

app.listen(port, () => console.log("Running on port " + port));
