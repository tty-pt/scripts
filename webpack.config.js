const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");

const isProduction = process.env.NODE_ENV == "production";
const entryPoint = "./src/index.jsx";

module.exports = {
  mode: isProduction ? "production" : "development",
  entry: {
    main: isProduction ? [entryPoint] : [
      "react-hot-loader/patch",
      "webpack-hot-middleware/client",
      entryPoint,
    ],
  },
  output: {
    path: path.resolve(process.cwd(), "build"),
  },
  devtool: isProduction ? "none" : "inline-source-map",
  devServer: {
    open: true,
    hot: true,
    host: "localhost",
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "public/index.html",
    }),

    new ESLintPlugin({
      context: "./",
      eslintPath: require.resolve("eslint"),
      extensions: ["js", "jsx", "ts", "tsx"],
    }),
  ].concat(isProduction ? [
    new WorkboxWebpackPlugin.GenerateSW(),
  ] : [
    new webpack.HotModuleReplacementPlugin(),
  ]),
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/i,
        loader: "babel-loader",
        exclude: /node_modules/,
        options: {
          presets: ["@babel/preset-react", "@babel/preset-env"],
          ...(isProduction ? {} : {
            plugins: ["react-hot-loader/babel"],
          }),
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
        type: "asset",
      },

      // Add your rules for custom modules here
      // Learn more about loaders from https://webpack.js.org/loaders/
    ],
  },
  resolve: {
    modules: [ "src", "node_modules", __dirname + "/node_modules" ],
    extensions: [".js", ".jsx"],
    alias: {
      "react-dom": "@hot-loader/react-dom",
    },
  },
};
