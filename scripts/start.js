const express = require("express");
const fs = require("fs");
const path = require("path");
const pkg = require(process.cwd() + "/package.json");
const port = 3030;
const { getConfigs } = require("../getConfigs");
const configs = getConfigs({ development: true, server: true });
let webpackCompiler;

const app = express();

if (fs.existsSync("./src/setupProxy.js"))
  require(process.cwd() + "/src/setupProxy.js")(app);

if (configs.esbuild.length) {
  const esbuild = require("esbuild");
  const chokidar = require("chokidar");
  const livereload = require("livereload");
  const connectLivereload = require("connect-livereload");
  const debounce = require("lodash.debounce");
  const firstConfig = configs.esbuild[0];
  const livereloadServer = livereload.createServer();
  livereloadServer.watch(process.cwd() + "/build");
  const oldPlugins = firstConfig.plugins;
  delete firstConfig.globalExternal;
  delete firstConfig.copyPatterns;
  esbuild.build(firstConfig);
  firstConfig.plugins = oldPlugins;
  app.use(connectLivereload());
  app.use(express.static(process.cwd() + "/build"));
  const rebuild = debounce(() => {
    esbuild.build(firstConfig)
      .then(() => console.log("BUILT"))
      .catch(() => console.warn("FAILED BUILDING"));
  }, 300);
  chokidar.watch(process.cwd() + "/src", { interval: 0 }).on("all", () => rebuild()); 
// } else if (configs.webpack.length) {
} else {
  const { webpack } = require("../webpack");
  const webpackHotMiddleware = require("webpack-hot-middleware");
  const webpackDevMiddleware = require("webpack-dev-middleware");

  const compiler = webpack(configs.original[0]);

  app.use(webpackDevMiddleware(compiler));

  app.use(webpackHotMiddleware(compiler));
  webpackCompiler = compiler;
/*
} else {
  const { spawn } = require('node:child_process');
  const swc = spawn('swc', ['src', '-w', '--out-dir', 'dist']);

  swc.stdout.on('data', (data) => console.log("" + data));
  swc.stderr.on('data', (data) => console.error("" + data));
  swc.on('close', (code) => console.log(`child process exited with code ${code}`));

  app.use(express.static(process.cwd() + "/dist"));
*/
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

(pkg?.serve || []).forEach(path => {
  app.use("/" + path, express.static(process.cwd() + "/" + path));
});

app.use("/node_modules", express.static(process.cwd() + "/node_modules"));

if (webpackCompiler)
  app.get('*', (_req, res) => {
    const indexPath = path.join(webpackCompiler.outputPath, 'index.html');

    webpackCompiler.outputFileSystem.readFile(indexPath, (err, result) => {
      if (err) {
        console.error('Error reading index.html from memory:', err);
        return res.status(500).send('An error occurred');
      }
      res.set('content-type','text/html').send(result).end();
    });
  });
else
  app.get('*', (_req, res) => {
    res.sendFile("/build/index.html", { root: "./" });
  });

const server = app.listen(port, () => console.log("Running on port " + port));

if (fs.existsSync("./src/setupServer.js"))
  require(process.cwd() + "/src/setupServer.js")(server);
