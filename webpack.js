const { bias } = require("./bias");
const webpack = require("webpack");
const webpackConfig = require(bias("webpack.config.js"));
const compiler = webpack(webpackConfig);

module.exports = {
  webpackConfig,
  compiler,
};
