const express = require("express");
const { webpack, makeConfig } = require("../webpack");
const webpackHotMiddleware = require("webpack-hot-middleware");
const webpackDevMiddleware = require("webpack-dev-middleware");
const fs = require("fs");
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

app.use("/public", express.static("/public"));

app.get("*", (req, res) => {
  res.sendFile("/public/index.html", { root: "./" });
});

app.listen(port, () => console.log("Webpack running on port " + port));
