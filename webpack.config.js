const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
// const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
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
    this.publicUrl = development ? "" : (pkg.publicUrl ?? "");
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
const hasBabelConfig = fs.existsSync(process.cwd() + "/babel.config.js");
const swcRcPath = process.cwd() + "/.swcrc";
const hasSwcRc = fs.existsSync(swcRcPath);
const swcConfig = hasSwcRc
  ? JSON.parse(fs.readFileSync(swcRcPath, "utf-8"))
  : JSON.parse(fs.readFileSync(__dirname + "/.swcrc", "utf-8"));

let dot = {};
const dotPath = process.cwd() + "/.config";
if (fs.existsSync(dotPath)) {
  const configFileContent = fs.readFileSync(dotPath, 'utf8');
  dot = configFileContent.split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (!key)
      return acc;
    acc[key] = value;
    return acc;
  }, {});
}

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

function getDepModules() {
  return [
    "node_modules",
    "node_modules/@tty-pt/scripts/node_modules",
    "../../libs",
    "src"
  ].concat(Object.keys(scriptsPackage.dependencies).map(depModule));
}

const depModules = getDepModules();
const origBabelConfig = require("./babel.config");
const lastEl = process.cwd().split("/").splice(-1)[0];
const regexStr = `^${path.resolve(process.cwd() + "/../../libs")}/(?!${lastEl})`;
const otherRegexStr = `^../../libs/(?!${lastEl})`;
console.log("REG", regexStr);
// const libsRegex = new RegExp(regexStr);
const excludeArr = [new RegExp(regexStr), new RegExp(otherRegexStr)];
// This is not ideal. If I'm building a library in this path, it wouldn't work.

function getParserConfig(module, parser) {
  if (parser === "swc") return {
    ...swcConfig,
    module: {
      ...swcConfig.module,
      type: module ? "es6" : "commonjs",
    }
  };

  const presetEnvConf = origBabelConfig.presets[0][1];
  const runtimePluginConf = origBabelConfig.plugins[origBabelConfig.plugins.length - 1][1];
  console.log("MODULE", module, regexStr, otherRegexStr, process.cwd());
  const ignoreArr = origBabelConfig.ignore.concat(excludeArr);
  return hasBabelConfig ? undefined : {
    ...origBabelConfig,
    ignore: ignoreArr,
    exclude: ignoreArr,
    presets: [
      [ "@babel/preset-env", { ...presetEnvConf, modules: module ? "auto" : "commonjs" } ],
    ].concat(origBabelConfig.presets.slice(1)),
    plugins: [
      ...origBabelConfig.plugins.slice(0, origBabelConfig.plugins.length - 2),
      [
        "@babel/plugin-transform-runtime", {
          ...runtimePluginConf,
          useESModules: module,
        }
      ]
    ]
  };
}

function getCodeRules(module, parser) {
  return parser === "swc" ? [{
    test: /\.(js|ts|tsx|jsx)$/i,
    exclude: excludeArr.concat([/node_modules/]),
    use: {
      loader: require.resolve("swc-loader"),
      options: {
        ...getParserConfig(module, "swc"),
        sourceMaps: development,
        minify: !development,
      },
    },
  }] : [{
    test: /\.(ts|tsx|js|jsx)$/i,
    include: /src/,
    exclude: excludeArr.concat([/node_modules/]),
    // exclude: [/node_modules/, path.resolve(process.cwd(), "../../libs")],
    // exclude: [/node_modules/, (modulePath) => {
    //   const realPath = fs.realpathSync(modulePath);
    //   return realPath.includes(path.resolve(process.cwd(), '../../libs'));
    // }],
    // exclude: (modulePath) => {
    //   console.log("modulePath", modulePath, path.resolve(process.cwd(), '../../libs'));
    //   if (modulePath.includes('/node_modules/')) {
    //     return true;
    //   }

    //   let realPath;
    //   try {
    //     realPath = fs.realpathSync(modulePath);
    //   } catch (err) {
    //     return true;
    //   }

    //   const libsPath = path.resolve(process.cwd(), '../../libs');
    //   if (realPath.startsWith(libsPath)) {
    //     console.log("MATCH");
    //     return true;
    //   }

    //   return false;
    // },
    loader: "babel-loader",
    options: getParserConfig(module),
  }];
}

module.exports = function makeConfig(env) {
  const {
    development = env.development,
    entry = "./src/index.jsx",
    parser = hasSwcRc ? "swc" : undefined,
    publicPath = "/",
    targets = [],
  } = pkg;
  let { main, template } = pkg;

  if (!main) {
    template = "./index.html";
    main = "./dist/index.js";
  }

  const splits = main.split("/");
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
      publicPath: development ? "/" : publicPath,
      // module: true,
      // environment: { module: true },
    },
    target: "web",
    plugins: [
      // new SrcDirectoryEnforcerPlugin(),
      new MiniCssExtractPlugin(),
      new webpack.DefinePlugin({
        "process.env": JSON.stringify(dot)
      }),
      // new webpack.NormalModuleReplacementPlugin(
      //   /..\/..\/libs/, // Regex to match the path
      //   resource => {
      //     if (resource.context.includes(path.resolve(process.cwd() + '/../../libs'))) {
      //       // Modify the resource request to ignore or redirect
      //       console.log("HERE", resource.context);
      //       resource.request = '/dev/null'; // Redirect to an empty module
      //     }
      //   }
      // ),
      function() {
        this.hooks.done.tap('DonePlugin', (stats) => {
          fs.writeFileSync(
            path.resolve(process.cwd() + '/stats.json'),
            JSON.stringify(stats.toJson())
          );
        });
      }
    ].concat(hasEslint ? [
      new ESLintPlugin({
        context: "./",
        eslintPath: require.resolve("eslint"),
        extensions: ["js", "jsx", "ts", "tsx"],
      }),
    ] : []),
    module: {
      rules: [
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
          test: /\.(eot|ttf|woff|woff2|svg|png|jpg)$/i,
          type: "asset",
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
      ],
    },
    resolveLoader: {
      modules: depModules,
      extensions: ['.js', '.json'],
      // symlinks: true,
      // symlinks: false,
    },
    experiments: {},
    externalsType: "umd",
    // devtool: "source-map",
    // experiments: {
    //   type: "module",
    //   outputModule: true,
    // },
    resolve: {
      modules: depModules,
      extensions: [".js", ".jsx", ".ts", ".tsx"],
      // symlinks: true,
      // symlinks: false,
      enforceExtension: false,
      // mainFields: ['main', 'module'],
      // mainFields: ["browser", 'main', 'module'],
      mainFields: ["browser", 'module', 'main'],
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

  function getFilename(field) {
    const splits = field.split("/");
    return splits[splits.length - 1];

  }

  config.externals = pkg.externals ? (pkg.externals["$add"] ? {
    ...libraryExternals(),
    ...pkg.externals,
  } : pkg.externals) : libraryExternals();

  if (pkg.module)
    targets.push("module");

  if (pkg.main || !targets.length)
    targets.push("umd");

  let configs = [];

  for (const target of targets) {
    let lname = main;
    let module = false;

    const targetConfig = {
      ...config,
      experiments: { ...config.experiments },
      output: { ...config.output },
      plugins: [ ...config.plugins ],
    };

    switch (target) {
      case "amd": lname = pkg.amd; break;
      case "module":
        module = true;
        lname = pkg.module;
        // targetConfig.externalsType = "module";
        // targetConfig.experiments.outputModule = true;
        // targetConfig.resolve.mainFields = ["module", "main"];
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
      // module = pkg.module === undefined || !!pkg.module;

      // targetConfig.externalsType = "var";
      targetConfig.plugins.push(new HtmlWebpackPlugin({
        inject: true,
        template,
        scriptLoading: module ? "module" : "defer",
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
        targetConfig.devServer = {
          open: true,
          hot: true,
          host: "localhost",
          historyApiFallback: true,
        };

        targetConfig.plugins.push(
          new webpack.HotModuleReplacementPlugin()
        );

        // targetConfig.plugins.push(
        //   new ReactRefreshWebpackPlugin({
        //     overlay: {
        //       sockIntegration: "whm",
        //     },
        //   }),
        // );
      } else
        targetConfig.plugins.push(
          new WorkboxWebpackPlugin.GenerateSW(),
        );
    }

    if (module) {
      targetConfig.externalsType = "module";
      targetConfig.experiments.outputModule = true;
      // targetConfig.resolve.mainFields = ["browser", "module", "main"];
    }

    targetConfig.module.rules = config.module.rules.concat(getCodeRules(module, parser));
    console.log("CONFIG", targetConfig.output.filename, targetConfig.module.rules[targetConfig.module.rules.length - 1].options, module, parser);
    // for (const rule of targetConfig.module.rules)
    //   console.log("RULE", JSON.stringify(rule));
    configs.push(targetConfig);
  }

  fs.writeFileSync(process.cwd() + "/wp.config.json", JSON.stringify(configs));
  return configs;
}
