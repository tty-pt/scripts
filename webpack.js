const { bias } = require("./bias");
const webpack = require("webpack");
const makeConfig = require(bias("webpack.config.js"));

module.exports = {
  webpack,
  makeConfig,
};
