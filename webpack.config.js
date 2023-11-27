const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
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
  const { development = env.development, template, targets = ["umd"], entry } = pkg;
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
      globalObject: "this",
      publicPath: "/node_modules/" + pkg.name + "/dist/",
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
          test: /\.png/i,
          use: ["file-loader"],
        },
        {
          test: /\.svg$/i,
          // use: ["@svgr/webpack"],
          use: ["file-loader"],
        },
        {
          test: /\.jpg$/i,
          use: ["file-loader"],
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
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            ecma: 6, // or higher depending on your source code
          },
        }),
      ],
    },
  };

  if (development) {
    config.mode = "development";
    config.devtool = "inline-source-map";
  }

  if (typeof targets === "string")
    targets = [targets];

  let configs = [];

  function getFilename(field) {
    const splits = field.split("/");
    return splits[splits.length - 1];

  }

  for (const target of targets) {
    const targetConfig = {
      ...config,
      plugins: [ ...config.plugins ],
    };

    if (template) {
      targetConfig.plugins.push(new HtmlWebpackPlugin({ inject: true, template }));
      targetConfig.plugins.push(new IndexPlugin(development));
    }

    targetConfig.devtool = "source-map";
    targetConfig.externalsType = "commonjs"; // or module?

    let name = pkg.main;

    if (target === "app") {
      targetConfig.output.filename = getFilename(pkg.main); 

      if (pkg.externals) {
        targetConfig.externals = pkg.externals === true || !pkg.externals ? libraryExternals() : {
          ...pkg.externals,
          ...(pkg.externals["$add"] ? libraryExternals() : {})
        };
      }

      if (development) {
        targetConfig.entry.main = [
          require.resolve("webpack-hot-middleware/client"),
          name,
        ];
        targetConfig.devtool = "inline-source-map";
        targetConfig.devServer = {
          open: true,
          hot: true,
          host: "localhost",
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
    } else {
      switch (target) {
        case "amd": name = pkg.amd;
      }

      targetConfig.externals = pkg.externals ? (pkg.externals["$add"] ? {
        ...libraryExternals(),
        ...pkg.externals,
      } : pkg.externals) : libraryExternals();

      targetConfig.output.filename = getFilename(name); 

      targetConfig.output.library = {
        name: pkg.name,
        type: target,
      }

      targetConfig.output.libraryTarget = target;

      targetConfig.output.environment = { "const": true };
    }

    console.log("EXTERNALS", Object.keys(targetConfig.externals).join(" "));

    configs.push(targetConfig);
  }

  return configs;
}
