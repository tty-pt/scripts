const express = require("express");
const { webpack, makeConfig } = require("../webpack");
const webpackHotMiddleware = require("webpack-hot-middleware");
const webpackDevMiddleware = require("webpack-dev-middleware");
const fs = require("fs");
const package = require(process.cwd() + "/package.json");
const port = 3030;

const app = express();

if (fs.existsSync("./src/setupProxy.js"))
  require(process.cwd() + "/src/setupProxy.js")(app);

const config = makeConfig({ development: true });

const compiler = webpack(config);

app.use(webpackDevMiddleware(compiler, {
  publicPath: config.output.publicPath,
}));

app.use(webpackHotMiddleware(compiler));

app.use(express.static(process.cwd() + "/public"));

(package.serve || []).forEach(path => {
  app.use("/" + path, express.static(process.cwd() + "/" + path));
});

app.get("/*.html", (req, res) => {
  res.sendFile("/index.html", { root: "./" });
});

app.listen(port, () => console.log("Webpack running on port " + port));
