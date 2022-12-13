const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");
const package = require(process.cwd() + "/package.json");
const entryPoint = "./src/index.jsx";

function libraryExternals() {
  return Object.keys(package.peerDependencies)
    .reduce((a, key) => ({
      ...a,
      [key]: key,
    }), {});
}

module.exports = function (env) {
  const { development, library } = env;

  const config = {
    mode: "production",
    entry: {
      main: [entryPoint],
    },
    output: {
      path: path.resolve(process.cwd(), "build"),
    },
    plugins: [
      new ESLintPlugin({
        context: "./",
        eslintPath: require.resolve("eslint"),
        extensions: ["js", "jsx", "ts", "tsx"],
      }),
    ],
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/i,
          loader: "babel-loader",
          exclude: /node_modules/,
          options: {
            presets: ["@babel/preset-react", "@babel/preset-env"],
            plugins: [],
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
      ],
    },
    resolveLoader: {
      modules: [ "node_modules", __dirname + "/node_modules" ],
      extensions: ['.js', '.json'],
      mainFields: ['loader', 'main'],
    },
    resolve: {
      modules: [ "src", "node_modules", path.resolve(__dirname, "/node_modules") ],
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

    config.output.library = {
      name: package.name,
      type: "umd",
    };
  } else {
    config.plugins.push(
      new HtmlWebpackPlugin({
        template: "public/index.html",
      })
    );
  }

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

    config.module.rules[0].options.plugins = [
      "react-hot-loader/babel"
    ];

    config.resolve.alias["react-dom"] = "@hot-loader/react-dom";
  }

  else {
    if (!library)
      config.plugins.push(
        new WorkboxWebpackPlugin.GenerateSW(),
      );
  }

  return config;
};
