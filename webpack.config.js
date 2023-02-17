const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");
const package = require(process.cwd() + "/package.json");
const scriptsPackage = require("./package.json");

const hasEslint = fs.existsSync(process.cwd() + "/.eslintrc.js");

function libraryExternals() {
  return Object.keys(package.peerDependencies)
    .reduce((a, key) => ({
      ...a,
      [key]: key,
    }), {});
}

function depModule(dep) {
  const thisPath = require.resolve(dep);
  return thisPath.substring(0, thisPath.lastIndexOf(dep) - 1);
}

function getDepModules() {
  return [
    "loaders", "node_modules", "node_modules/.pnpm/*",
    "node_modules/@tty-pt/scripts/node_modules",
  ].concat(Object.keys(scriptsPackage.dependencies).map(depModule));
}

module.exports = function (env) {
  const { development, library, srcdir = "src", entry = "index.jsx", buggy } = env;
  const entryPoint = "./" + srcdir + "/" + entry;
  const depModules = getDepModules();

  const config = {
    mode: "production",
    entry: {
      main: [entryPoint],
    },
    output: {
      path: path.resolve(process.cwd(), "build"),
    },
    plugins: hasEslint ? [
      new ESLintPlugin({
        context: "./",
        eslintPath: require.resolve("eslint"),
        extensions: ["js", "jsx", "ts", "tsx"],
      }),
    ] : [],
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/i,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env", "@babel/preset-react"].map(require.resolve),
              plugins: [],
            },
          },
        },
        {
          test: /\.(ts|tsx)$/i,
          exclude: /node_modules/,
          loader: "ts-loader",
        },
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
          type: "asset",
        },
      ],
    },
    resolveLoader: {
      modules: depModules,
      extensions: ['.js', '.json'],
      mainFields: ['loader', 'main'],
    },
    resolve: {
      modules: [ srcdir ].concat(depModules),
      extensions: [".js", ".jsx"],
      alias: {},
      // vscode: require.resolve(
      //   "@codingame/monaco-languageclient/lib/vscode-compatibility"
      // ),
    },
    externals: {},
  };

  if (library) {
    config.externals = libraryExternals();
    config.externalsType = "commonjs";

    config.output.library = {
      name: package.name,
      type: "umd",
    };

    config.plugins.push(
      new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 })
    );

    if (development) {
      config.devtool = "inline-source-map";
    }
  } else {
    config.plugins.push(
      new HtmlWebpackPlugin({
        template: buggy ? "public/index.html" : "index.html",
      })
    );

    if (development) {
      config.mode = "development";
      config.entry.main = [
        "react-hot-loader/patch",
        "webpack-hot-middleware/client",
        entryPoint,
      ];
      config.devtool = "inline-source-map";
      config.devServer = {
        open: true,
        hot: true,
        host: "localhost",
      };

      config.plugins.push(
        new webpack.HotModuleReplacementPlugin()
      );

      config.module.rules[0].use.options.plugins = [
        "react-hot-loader/babel"
      ];

      config.resolve.alias["react-dom"] = "@hot-loader/react-dom";
    } else
      config.plugins.push(
        new WorkboxWebpackPlugin.GenerateSW(),
      );
  }

  return config;
};
