const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");
const package = require(process.cwd() + "/package.json");
const scriptsPackage = require("./package.json");

const hasEslint = fs.existsSync(process.cwd() + "/.eslintrc.js");
const swcConfigPath = process.cwd() + "/swc.config.json";
const hasSwcConfig = fs.existsSync(swcConfigPath);

function libraryExternals() {
  return Object.keys(package.peerDependencies ?? {})
    .reduce((a, key) => ({
      ...a,
      [key]: key,
    }), {});
}

function depModule(dep) {
  const thisPath = require.resolve(dep);
  return thisPath.substring(0, thisPath.lastIndexOf(dep) - 1);
}

function relsolve(pathName) {
  return path.resolve(process.cwd(), pathName);
}

function getDepModules() {
  return [
    "../..",
    "../../node_modules",
    "../../node_modules/.pnpm/@types+node@16.18.35/node_modules",
    "node_modules",
    "node_modules/@tty-pt/scripts/node_modules",
    "src"
  ].concat(Object.keys(scriptsPackage.dependencies).map(depModule));
}

const swcConfig = hasSwcConfig ? JSON.parse(fs.readFileSync(swcConfigPath, "utf-8")) : null;

const defaultConfig = {
  entry: "./src/index.jsx",
  development: false,
  stringEntry: false,
  outputExtension: "js",
  template: "./public/index.html",
};

const scriptsConfig = {
  ...defaultConfig,
  ...(package?.["@tty-pt/scripts"] ?? {}),
};

const depModules = getDepModules();

module.exports = function makeConfig(env) {
  const { template, library, entry, stringEntry, outputExtension } = scriptsConfig;

  const development = env.development ?? scriptsConfig.development;
  
  const config = {
    mode: "production",
    entry: stringEntry ? entry : { main: [entry] },
    output: {
      filename: "[name]." + outputExtension,
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
          test: /\.(js|ts|tsx)$/i,
          exclude: /node_modules/,
          use: {
            loader: require.resolve("swc-loader"),
            options: swcConfig ?? {
              sourceMaps: development,
              minify: !development,
            },
          },
        },
        {
          test: /\.jsx$/i,
          exclude: /node_modules/,
          use: {
            loader: require.resolve("swc-loader"),
            options: swcConfig ?? {
              sourceMaps: development,
              jsc: {
                parser: {
                  syntax: "ecmascript",
                  jsx: true,
                }
              },
              minify: !development,
            },
          },
        },
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"].map(require.resolve),
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
      symlinks: true,
    },
    resolve: {
      modules: depModules,
      extensions: [".js", ".jsx", ".ts", ".tsx"],
      alias: {
        react: relsolve('../../node_modules/react'),
        "react-dom": relsolve('../../node_modules/react-dom'),
        "@emotion/react": relsolve('../../node_modules/@emotion/react'),
        "@emotion/styled": relsolve('../../node_modules/@emotion/styled'),
        "@types/node": relsolve('../../node_modules/@types/node'),
        "@types/react": relsolve('../../node_modules/@types/react'),
        "@types/react-dom": relsolve('../../node_modules/@types/react-dom'),
      },
      symlinks: true,
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
      new HtmlWebpackPlugin({ template })
    );

    if (development) {
      config.mode = "development";
      config.entry.main = [
        require.resolve("webpack-hot-middleware/client"),
        entry,
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

      config.plugins.push(
        new ReactRefreshWebpackPlugin({
          overlay: {
            sockIntegration: "whm",
          },
        }),
      );
    } else
      config.plugins.push(
        new WorkboxWebpackPlugin.GenerateSW(),
      );
  }

  return config;
}
