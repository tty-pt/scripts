const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
// const ImportMapWebpackPlugin = require('webpack-import-map-plugin');
// const WebpackManifestPlugin = require('webpack-manifest-plugin').WebpackManifestPlugin;
// const ESBuildPlugin = require('esbuild-webpack-plugin').default;
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
  return Object.keys(pkg.peerDependencies ?? {}).concat(Object.keys(pkg.optionalDependencies ?? {}))
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

const depModules = getDepModules();

module.exports = function makeConfig(env) {
  const { development = env.development, template, entry } = pkg;
  let { targets } = pkg;
  const splits = pkg.main.split("/");
  const dist = splits[splits.length - 2];
  const filename = splits[splits.length - 1];

  const config = {
    mode: "production",
    entry: { main: entry },
    output: {
      filename,
      chunkFilename: "static/js/[name].chunk.js",
      assetModuleFilename: "static/media/[name].[hash][ext]",
      path: path.resolve(process.cwd() + "/" + dist),
      umdNamedDefine: true,
      globalObject: "globalThis",
      publicPath: "/node_modules/" + pkg.name + "/dist/",
      publicPath: "/",
      // module: true,
      // environment: { module: true },
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
      rules: (pkg.parser === "swc" ? [
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
      ] : [
        {
          test: /\.(ts|tsx)$/i,
          exclude: /node_modules/,
          loader: "ts-loader",
        },
        {
          test: /\.(js|jsx)$/i,
          exclude: /node_modules/,
          loader: "babel-loader",
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
          test: /\.(png|svg|jpg)$/i,
          use: ["file-loader"],
        },
        {
          test: /\.json$/,
          loader: 'json-loader',
          type: 'javascript/auto',
          options: { charset: 'utf-8' },
        },
        {
          test: /\.html$/,
          loader: 'html-loader'
        },
      ]),
    },
    resolveLoader: {
      modules: depModules,
      extensions: ['.js', '.json'],
      mainFields: ['loader', 'main'],
      symlinks: true,
    },
    experiments: {},
    externalsType: "umd",
    devtool: "source-map",
    // experiments: {
    //   type: "module",
    //   // outputModule: true,
    // },
    resolve: {
      modules: depModules,
      extensions: [".js", ".jsx", ".ts", ".tsx"],
      // alias: Object.keys(pkg.dependencies).reduce(
      //   (a, key) => ({ ...a, [key]: process.cwd() + "/node_modules/" + key }),
      //   {}
      // ),
      // alias: Object.keys(pkg.dependencies).reduce(
      //   (a, key) => ({ ...a, [key]: "./mod/" + key }),
      //   {}
      // ),
      symlinks: true,
      enforceExtension: false,
    },
    externals: {},
    optimization: {
      minimize: !development,
      usedExports: false,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            ecma: 6, // or higher depending on your source code
          },
        }),
        // new ESBuildPlugin(),
      ],
    },
  };

  if (development) {
    config.mode = "development";
    config.devtool = "inline-source-map";
  }

  let name = pkg.main;

  function getFilename(field) {
    const splits = field.split("/");
    return splits[splits.length - 1];

  }

  config.externals = pkg.externals ? (pkg.externals["$add"] ? {
    ...libraryExternals(),
    ...pkg.externals,
  } : pkg.externals) : libraryExternals();

  if (!targets) {
    targets = ["umd"];
    if (pkg.module)
      targets.push("module");
  }

  let configs = [];

  for (const target of targets) {
    let lname = pkg.main;

    const targetConfig = {
      ...config,
      experiments: { ...config.experiments },
      output: { ...config.output },
      plugins: [ ...config.plugins ],
    };

    switch (target) {
      case "amd": lname = pkg.amd; break;
      case "module":
        lname = pkg.module;
        targetConfig.externalsType = "module";
        targetConfig.experiments.outputModule = true;
        break;
    }

    targetConfig.output.filename = getFilename(lname); 

    targetConfig.output.library = {
      ...(target === "module" ? {} : {
        name: pkg.name,
      }),
      type: target,
    }

    targetConfig.output.libraryTarget = target;
    targetConfig.output.environment = { "const": true };

    if (template) {
      targetConfig.externalsType = "var";
      targetConfig.plugins.push(new HtmlWebpackPlugin({
        inject: true,
        template,
        // scriptLoading: "module",
        // importMap: JSON.stringify(require(process.cwd() + "/import.json")),
      }));
      targetConfig.plugins.push(new IndexPlugin(development));
      // targetConfig.plugins.push(new WebpackManifestPlugin({
      //   writeToFileEmit: true,
      // }));

      if (development) {
        targetConfig.entry.main = [
          require.resolve("webpack-hot-middleware/client"),
          entry,
        ];
        targetConfig.devtool = "inline-source-map";
        targetConfig.devServer = {
          open: true,
          hot: true,
          host: "localhost",
          historyApiFallback: true,
        };

        targetConfig.plugins.push(
          new webpack.HotModuleReplacementPlugin()
        );

        targetConfig.plugins.push(
          new ReactRefreshWebpackPlugin({
            overlay: {
              sockIntegration: "whm",
            },
          }),
        );
      } else
        targetConfig.plugins.push(
          new WorkboxWebpackPlugin.GenerateSW(),
        );
    }

    configs.push(targetConfig);
  }

  return configs;
}
