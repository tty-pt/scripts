const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const pkg = require(process.cwd() + "/package.json");
const scriptsPackage = require("./package.json");

class IndexPlugin {
  constructor(development) {
    this.publicUrl = development ? "" : pkg.homepage;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('IndexPlugin', compilation => {
      HtmlWebpackPlugin
        .getHooks(compilation)
        .afterTemplateExecution.tap('IndexPlugin', data => {
          data.html = data.html.replace(
            new RegExp('%PUBLIC_URL%', 'g'),
            this.publicUrl
          );
        });
    });
  }
}

const hasEslint = fs.existsSync(process.cwd() + "/eslint.json");
const { bias } = require("./bias.js");
const swcConfigPath = bias(".swcrc");

function libraryExternals() {
  return Object.keys(pkg.peerDependencies ?? {})
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
    "node_modules",
    "node_modules/@tty-pt/scripts/node_modules",
    "src"
  ].concat(Object.keys(scriptsPackage.dependencies).map(depModule));
}

const swcConfig = JSON.parse(fs.readFileSync(swcConfigPath, "utf-8"));

const defaultConfig = {
  entry: pkg.entry ?? "./src/index.tsx",
  development: true,
  stringEntry: false,
  library: true,
  outputExtension: "js",
  libraryTarget: "amd",
  template: pkg.template,
};

const scriptsConfig = {
  ...defaultConfig,
  ...(pkg?.["@tty-pt/scripts"] ?? {}),
};

const depModules = getDepModules();

module.exports = function makeConfig(env) {
  const { template, library, entry, stringEntry } = scriptsConfig;

  const development = env.development ?? scriptsConfig.development;

  const splits = pkg.main.split("/");
  const dist = splits[splits.length - 2];
  const filename = splits[splits.length - 1];

  const config = {
    mode: "production",
    entry: stringEntry ? entry : { main: entry },
    output: {
      filename,
      chunkFilename: "static/js/[name].chunk.js",
      assetModuleFilename: "static/media/[name].[hash][ext]",
      path: path.resolve(process.cwd() + "/" + dist),
    },
    target: "web",
    plugins: [
      new MiniCssExtractPlugin(),
    ].concat(hasEslint ? [
      new ESLintPlugin({
        context: "./",
        eslintPath: require.resolve("eslint"),
        extensions: ["js", "jsx", "ts", "tsx"],
      }),
    ] : []),
    module: {
      rules: (scriptsConfig.parser !== "swc" ? [
        {
          test: /\.(ts|tsx)$/i,
          exclude: /node_modules/,
          loader: "ts-loader",
        },
        {
          test: /\.(js|jsx)$/i,
          exclude: /node_modules/,
          use: { loader: "babel-loader" },
        },
      ] : [
        {
          test: /\.(js|ts|tsx)$/i,
          exclude: /node_modules/,
          use: {
            loader: require.resolve("swc-loader"),
            options: {
              ...swcConfig[0],
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
            options: {
              ...swcConfig[1],
              sourceMaps: development,
              minify: !development,
            },
          },
        },
      ]).concat([
        {
          test: /\.css/i,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
            },
            "css-loader"
          ],
        },
        {
          test: /\.(eot|ttf|woff|woff2)$/i,
          type: "asset",
        },
        {
          test: /\.png/i,
          use: ["file-loader"],
        },
        {
          test: /\.(svg|jpg|git)$/i,
          use: ["@svgr/webpack"],
        },
      ]),
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
        react: relsolve('node_modules/react'),
        "react-dom": relsolve('node_modules/react-dom'),
      },
      symlinks: true,
    },
    externals: {},
  };

  if (development) {
    config.mode = "development";
    config.devtool = "inline-source-map";
  }

  if (library) {
    config.externals = libraryExternals();
    config.externalsType = "commonjs"; // or module?

    config.output.library = {
      name: pkg.name,
      type: scriptsConfig.libraryTarget,
    }
    config.output.environment = { "const": true };

    config.plugins.push(
      new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 })
    );

    config.experiments = {
      outputModule: true,
    };
  } else {
    template && config.plugins.push(new HtmlWebpackPlugin({ inject: true, template }));
    config.plugins.push(new IndexPlugin(development));

    if (development) {
      config.entry.main = library ? entry : [
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

  // const config2 = { ...config, output: { ...config.output } };
  // config2.output.libraryTarget = "commonjs2";
  // config2.output.filename = pkg.module.replace("dist/", "");
  // return [config, config2];

  return config;
}
