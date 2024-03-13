const express = require("express");
const fs = require("fs");
const path = require("path");
const pkg = require(process.cwd() + "/package.json");
const port = 3030;
const getConfigs = require("../getConfigs");
const configs = getConfigs({ development: true, server: true });
let webpackCompiler;

const app = express();

/*
function isExternalCss(importPath) {
  return importPath.endsWith('.css');
}
*/

const injectExternalsPlugin = (externals) => ({
  name: 'inject-externals',
  setup(build) {
    /*
    const cssFiles = new Set();
    const externalMap = externals.reduce((a, [dep]) => ({ ...a, [dep]: true}), {});

    build.onResolve({ filter: /\.css$/ }, args => {
      if (isExternalCss(args.path)) {
        if (args.path.substring(0, 1) === ".") {
          return { path: path.resolve(args.resolveDir, args.path), external: false };
        }

        const [org, pack] = args.path.split("/");
        if (externalMap[org] || externalMap[org + "/" + pack]) {
          cssFiles.add("./node_modules/" + args.path);
          return { path: args.path, external: true };
        } else
          return {
            path: require.resolve(process.cwd() + "/node_modules/" + args.path),
            external: false,
          };
      }
    });
    */

    build.onEnd((_result) => {
      const outputPath = path.join(build.initialOptions.outdir, 'index.html');
      let htmlContent = fs.readFileSync(outputPath, 'utf8');

      const scripts = externals.map(([_dep, _key, url]) =>
        `<script src="${url}"></script>`
      ).join('');

      /*
      const links = Array.from(cssFiles).map(cssFile => {
        const relativePath = path.relative(path.dirname(outputPath), cssFile);
        return `<link rel="stylesheet" href="${relativePath}">`;
      }).join('\n');

      htmlContent = htmlContent.replace('</head>', `${links}</head>`);
      */
      htmlContent = htmlContent.replace('</body>', `${scripts}</body>`);

      fs.writeFileSync(outputPath, htmlContent, 'utf8');
    });
  }
});

if (fs.existsSync("./src/setupProxy.js"))
  require(process.cwd() + "/src/setupProxy.js")(app);

if (pkg.devServer === "esbuild" && configs.esbuild.length) {
  const esbuild = require("esbuild");
  const { livereloadPlugin } = require('@jgoz/esbuild-plugin-livereload');
  const { htmlPlugin } = require('@craftamap/esbuild-plugin-html');
  const firstConfig = configs.esbuild[0];
  firstConfig.plugins.push(livereloadPlugin());
  firstConfig.plugins.push(htmlPlugin({
    files: [{
      entryPoints: [pkg.entry],
      htmlTemplate: fs.readFileSync(process.cwd() + "/" + pkg.template, "utf-8"),
      filename: "index.html",
    }]
  }));
  firstConfig.plugins.push(injectExternalsPlugin(firstConfig.globalExternal));
  delete firstConfig.globalExternal;
  esbuild.build(firstConfig);
  app.use(express.static(process.cwd() + "/build"));
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
    res.sendFile("/index.html", { root: "./" });
  });

const server = app.listen(port, () => console.log("Running on port " + port));

if (fs.existsSync("./src/setupServer.js"))
  require(process.cwd() + "/src/setupServer.js")(server);
