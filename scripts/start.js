const express = require("express");
const fs = require("fs");
const path = require("path");
const pkg = require(process.cwd() + "/package.json");
const port = 3030;

const app = express();

if (fs.existsSync("./src/setupProxy.js"))
  require(process.cwd() + "/src/setupProxy.js")(app);

if (true) {
  const { webpack, makeConfig } = require("../webpack");
  const webpackHotMiddleware = require("webpack-hot-middleware");
  const webpackDevMiddleware = require("webpack-dev-middleware");
  // const chokidar = require('chokidar');

  const [config] = makeConfig({ development: true, server: true });

  const compiler = webpack(config);

  app.use(webpackDevMiddleware(compiler, {
    publicPath: config.output.publicPath,
  }));

  app.use(webpackHotMiddleware(compiler));

  // chokidar.watch(config.plugins[0].extInfo).on('change', () => {
  //   fs.utimesSync(pkg.template, new Date(), new Date());
  //   compiler.hooks.invalid.call();
  //   // webpackHotMiddleware.publish({ action: 'reload' });
  // });
} else {
  const { spawn } = require('node:child_process');
  const swc = spawn('swc', ['src', '-w', '--out-dir', 'dist']);

  swc.stdout.on('data', (data) => console.log("" + data));
  swc.stderr.on('data', (data) => console.error("" + data));
  swc.on('close', (code) => console.log(`child process exited with code ${code}`));

  app.use(express.static(process.cwd() + "/dist"));
}

app.use((req, _res, next) => {
    if (path.extname(req.path).length === 0) {
      if (fs.existsSync(path.join(process.cwd(), `${req.path}index.js`)))
        req.url += 'index.js';
      else if (fs.existsSync(path.join(process.cwd(), `${req.path}.js`)))
        req.url += '.js';
    }
  next();
});

app.use(express.static(process.cwd() + "/public/static"));

(pkg?.serve || []).forEach(path => {
  app.use("/" + path, express.static(process.cwd() + "/" + path));
});

app.use("/lib", express.static(process.cwd() + "/node_modules"));

// app.get("/*.html", (req, res) => {
//   res.sendFile("/index.html", { root: "./" });
// });

app.get("/*.js", (req, res) => {
  res.sendFile("./build/main.js", { root: "./" });
});

const server = app.listen(port, () => console.log("Running on port " + port));

if (fs.existsSync("./src/setupServer.js"))
  require(process.cwd() + "/src/setupServer.js")(server);
