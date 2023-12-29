const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require('copy-webpack-plugin');
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");
const EsBuildPlugin = require("esbuild-webpack-plugin").default;
const { SWCMinifyPlugin } = require("swc-webpack-plugin");
const TerserPlugin = require('terser-webpack-plugin');
const pkg = require(process.cwd() + "/package.json");
const mainPkg = pkg;
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
          // ).replace(new RegExp("\"./", "g"), this.publicUrl);
        });
    });
  }
}

class ExtInfoPlugin {
  constructor(extInfo) {
    this.extInfo = extInfo;
  }
  apply(_compiler) {
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

function externalKeys(pkg, options = {}) {
  const { optional, explicit } = options;
  return explicit ? Object.keys(pkg.external ?? {})
    : Object.keys(pkg.peerDependencies ?? {})
    .concat(optional ? Object.keys(pkg.optionalDependencies ?? {}) : [])
    .concat(Object.keys(pkg.dependencies ?? {}));
}

function depModule(dep) {
  const thisPath = require.resolve(dep);
  return thisPath.substring(0, thisPath.lastIndexOf(dep) - 1);
}

function getDepModules() {
  return [
    "node_modules",
    "node_modules/@tty-pt/scripts/node_modules",
    "src"
  ].concat(Object.keys(scriptsPackage.dependencies).map(depModule));
}

const depModules = getDepModules();
const origBabelConfig = require("./babel.config");
const origTsConfig = require("./sconfig.json");
const lastEl = process.cwd().split("/").splice(-1)[0];
const regexStr = `^${path.resolve(process.cwd() + "/../../libs")}/(?!${lastEl})`;
const otherRegexStr = `^../../libs/(?!${lastEl})`;
const excludeArr = [new RegExp(regexStr), new RegExp(otherRegexStr)];

delete origTsConfig.compilerOptions.emitDeclarationOnly;
delete origTsConfig.exclude;
delete origTsConfig.include;
delete origTsConfig.transform;
delete origTsConfig["ts-node"];

function getParserConfig(module, parser) {
  if (parser === "swc") return {
    ...swcConfig,
    module: {
      ...swcConfig.module,
      type: module ? "es6" : "commonjs",
    }
  };

  if (parser === "ts")
    return {
      ...origTsConfig,
      compilerOptions: {
        ...origTsConfig.compilerOptions,
        emitDeclarationOnly: false,
        esModuleInterop: undefined,
      }
    };

  const presetEnvConf = origBabelConfig.presets[0][1];
  const runtimePluginConf = origBabelConfig.plugins[origBabelConfig.plugins.length - 1][1];
  const ignoreArr = origBabelConfig.ignore ? origBabelConfig.ignore.concat(excludeArr) : [];
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
        sourceMaps: pkg.development,
        minify: !pkg.development,
      },
    },
  }] : parser === "ts" ? [{
    test: /\.(ts|tsx|js|jsx)$/i,
    include: /src/,
    exclude: excludeArr.concat([/node_modules/]),
    loader: "ts-loader",
    options: getParserConfig(module, "ts"),
  }] : parser === "babel" ? [{
    test: /\.(ts|tsx|js|jsx)$/i,
    include: /src/,
    exclude: excludeArr.concat([/node_modules/]),
    loader: "babel-loader",
    options: getParserConfig(module, "babel"),
  }] : [{
    test: /\.(ts|tsx|js|jsx)$/i,
    include: /src/,
    exclude: excludeArr.concat([/node_modules/]),
    loader: "esbuild-loader",
    options: {
      loader: "jsx",
    }
  }];
}

const cwd = process.cwd();

const order = ["unpkg", "main:umd", "module", "browser", "main"];

function getImports(imports, path, pkg, explicit, depth = 0) {
  const extKeys = externalKeys(pkg, { optional: !depth, explicit });
  depth ++;

  for (const dep of extKeys) {
    if (imports[dep]) {
      imports[dep].depth = depth;
      continue;
    }

    const depParts = dep.split("/");
    let depPkgPath;
    const shifted = [];

    while (depParts.length) {
      shifted.push(depParts.shift());
      depPkgPath = cwd + path + shifted.join("/") + "/package.json";

      if (fs.existsSync(depPkgPath))
        break;
    }

    const depPkg = JSON.parse(fs.readFileSync(depPkgPath, "utf-8"));
    const depPath = path + shifted.join("/");

    imports[dep] = {
      ...order.reduce((a, ord) => depPkg[ord] ? ({
        ...a,
        [ord]: depParts.length ? depParts.join("/") + ".js" : depPkg[ord],
      }) : a, {}),
      pkg: depPkg,
      path: depPath + "/",
      version: depPkg.version,
      depth,
    };
  }

  for (const dep of extKeys) {
    if (!imports[dep])
      continue;
    getImports(imports, path + dep + `/${pkg.modulesPath ?? 'node_modules'}/`, imports[dep].pkg, explicit, depth);
  }
}

const unsortedImports = {};
getImports(unsortedImports, `/${pkg.modulesPath ?? 'node_modules'}/`, pkg, true);

const imports = Object.entries(unsortedImports).sort(([_akey, adep], [_bkey, bdep]) => (
  bdep.depth - adep.depth
)).reduce((a, [dep, imp]) => ({
  ...a,
  [dep]: imp,
}), {});

const ordType = {
  'main': 'umd',
  'browser': 'umd',
  'main:umd': 'umd',
  'unpkg': 'umd'
};

let dist = "dist";

for (const ord of order)
  if (pkg[ord]) {
    const splits = pkg[ord].split("/");
    dist = splits[splits.length - 2];
  }

function otherExtProc(key, imp, extType) {
  const glob = mainPkg.external?.[key];
  let path;
  let entry;

  if (mainPkg.resolve?.[key]) {
    const cdn = (mainPkg.cdn ?? "https://unpkg.com/$NAME@$VERSION")
      .replace("$NAME", key).replace("$VERSION", imports[key].pkg.version);
    return [glob, cdn + "/" + mainPkg.resolve[key]];
  }

  for (const ord of order) {
    if (ord === "module" && extType !== "module")
      continue;
    else if (imp[ord]) {
      const type = (ordType[ord] ?? ord);
      path = glob ? glob : (type === extType ? "" : type  + " ");
      entry = mainPkg.resolve?.[key] ?? imp[ord];
      break;
    }
  }

  if (!entry) {
    entry = mainPkg.resolve?.[key]
      ?? imp.pkg.exports["./" + key.substring(imp.pkg.name.length + 1)];
    path = glob;
  }

  return [
    path,
    (mainPkg.copyUnresolved ? "./lib/" + key + "/" + entry : imp.path + entry),
    entry
  ]
}

function moduleExtProc(key, imp, extType) {
  const prefix = extType === "module" ? "" : "module ";
  if (imp.pkg.module)
    return [prefix + key, imp.path + imp.pkg.module, imp.pkg.module];
  else if (mainPkg.resolve?.[key]) {
    const cdn = (mainPkg.cdn ?? "https://cdn.skypack.dev/$NAME@$VERSION")
      .replace("$NAME", dep).replace("$VERSION", depPkg.version);
    return [prefix + key, cdn];
  } else
    return otherExtProc(key, imp, extType);
}

class ImportsPlugin {
  constructor(imports, module, pkg, env) {
    this.importMap = { imports: Object.entries(imports).reduce((a, [key, value]) => ({ ...a, [key]: value.path }), {}) };
    this.imports = imports;
    this.module = module;
    this.publicPath = pkg.homepage && !env.server ? pkg.homepage + "/" : "/";
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('ImportMapPlugin', (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(
        'ImportsPlugin',
        (data, cb) => {
          let str = "";
          const position = data.html.indexOf('<script');
          if (this.module)
            str += `<script type="importmap">${JSON.stringify(this.importMap)}</script>`;
          for (const dep in this.imports) {
            const imp = this.imports[dep];
            const typeStr = imp.module ? `type="module"` : "";
            const rootDir = imp.path.substring(0, "4") === "http" ? "" : this.publicPath;
            str += `<script ${typeStr} src="${rootDir}${imp.path}"></script>`;
          }
          data.html = data.html.substring(0, position)
            + str
            + data.html.substring(position);
          cb(null, data);
        }
      );
    });
  }
}

module.exports = function makeConfig(env) {
  const {
    development = env.development,
    entry = "./src/index.jsx",
    parser = hasSwcRc ? "swc" : undefined,
    publicPath = pkg.template ? (pkg.homepage && !env.server ? pkg.homepage + "/" : "/") : "./lib/" + pkg.name + "/dist/",
    targets = [],
    template,
  } = pkg;

  const config = {
    mode: "production",
    entry: {},
    output: {
      filename: '[name].js', // overwritten
      chunkFilename: "[name].chunk.js",
      assetModuleFilename: "[name].[hash][ext]",
      path: path.resolve(process.cwd() + "/" + dist),
      umdNamedDefine: true,
      globalObject: "globalThis",
      publicPath,
      // module: true,
      // environment: { module: true },
    },
    target: "web",
    plugins: [
      new webpack.DefinePlugin({
        process: JSON.stringify(`({ env: ${dot} })`),
      }),
    ].concat(hasEslint ? [
      new ESLintPlugin({
        context: "./",
        eslintPath: require.resolve("eslint"),
        extensions: ["js", "jsx", "ts", "tsx"],
      }),
    ] : []).concat(mainPkg.stats ? [
      function() {
        this.hooks.done.tap('DonePlugin', (stats) => {
          fs.writeFileSync(
            path.resolve("/tmp/scripts.stats.json"),
            JSON.stringify(stats.toJson())
          );
        });
      }
    ] : []),
    module: {
      rules: [
        {
          test: /\.css/i,
          use: [
            "style-loader",
            "css-loader"
          ],
        },
        {
          test: /\.(eot|ttf|woff|woff2|svg|png|jpg)$/i,
          type: "asset/inline",
        },
        {
          test: /\.json$/,
          loader: 'json-loader',
          type: 'javascript/auto',
          options: { charset: 'utf-8' },
        },
      ],
    },
    resolveLoader: {
      modules: depModules,
      extensions: ['.js', '.json'],
    },
    experiments: {},
    externalsType: "umd",
    devtool: "source-map",
    cache: {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename]
      }
    },
    // devtool: "source-map",
    // experiments: {
    //   type: "module",
    //   outputModule: true,
    // },
    resolve: {
      alias: {
        ...(Object.entries(mainPkg.resolve ?? {})
          .filter(([_key, value]) => {
            try {
              require.resolve(value);
              return true;
            } catch (_error) {
              return false;
            }
          })
          .reduce((a, [key, value]) => ({ ...a, [key]: value }), {})
        ),
      },
      modules: depModules,
      extensions: [".js", ".jsx", ".ts", ".tsx"],
      enforceExtension: false,
      mainFields: ["browser", 'module', 'main'],
    },
    externals: {},
    optimization: {
      // splitChunks: {
      //   cacheGroups: {
      //     default: false,
      //     defaultVendors: false,
      //   },
      // },
      minimize: !development,
      usedExports: false,
      minimizer: [
        mainPkg.minimizer === "terser" ? (
          new TerserPlugin({
            // parallel: false,
            terserOptions: {
              ecma: 6, // or higher depending on your source code
            },
          })
        ) : (mainPkg.minimizer === "swc" ? (
          new SWCMinifyPlugin()
        ) : (
          new EsBuildPlugin()
        )),
      ],
    },
  };

  if (development) {
    config.mode = "development";
    // config.devtool = "inline-source-map";
  }

  function getFilename(field) {
    const splits = field.split("/");
    const newSplits = splits[splits.length - 1].split(".");
    newSplits.pop();
    return newSplits.join(".");
  }

  if (pkg.module && !pkg["!module"])
    targets.push("module");

  if (pkg.main || !targets.length)
    targets.push("umd");

  let configs = [];

  for (const target of targets) {
    let lname = pkg.main;
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
        break;
    }

    const filename = getFilename(lname);
    targetConfig.entry[filename] = entry;

    if (module) {
      targetConfig.externalsType = "module";
      targetConfig.experiments.outputModule = true;
      // targetConfig.resolve.mainFields = ["browser", "module", "main"];
    }

    targetConfig.externals = {};
    const targetImports = {};
    const copyPatterns = [];
    const extInfo = [];

    if (fs.existsSync(process.cwd() + "/public"))
      copyPatterns.push({ from: "./public", to: "" });

    for (const dep in imports) {
      if (!mainPkg.external[dep])
        continue;
      const isModule = mainPkg.external[dep].substring(0, 7) === "module ";
      const extProc = isModule ? moduleExtProc : otherExtProc;
      const [key, value, entry] = extProc(dep, imports[dep], targetConfig.externalsType);
      if (value) {
        targetConfig.externals[dep] = key;
        targetImports[dep] = { path: value, module: isModule };
      }

      if (!entry)
        continue;

      const depDist = entry.split("/")[0];

      if (env.server)
        extInfo.push("./node_modules/" + dep + "/" + depDist);

      else if (mainPkg.copyUnresolved)
        copyPatterns.push({
          from: "./node_modules/" + dep + "/" + depDist,
          to: "lib/" + dep + "/" + depDist,
        });
    }

    if (copyPatterns.length) {
      targetConfig.plugins.push(new CopyPlugin({
        patterns: copyPatterns,
      }));
    }

    if (template) {
      targetConfig.plugins.push(new HtmlWebpackPlugin({
        inject: true,
        template,
        scriptLoading: module ? "module" : "defer",
      }));
      targetConfig.plugins.push(new ImportsPlugin(targetImports, module, mainPkg, env));
      targetConfig.plugins.push(new IndexPlugin(development));

      if (development && !pkg.static) {
        targetConfig.entry[filename] = [
          "webpack-hot-middleware/client?reload=true",
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

        targetConfig.plugins.push(
          new ReactRefreshWebpackPlugin({
            overlay: {
              sockIntegration: "whm",
            },
          }),
        );

        targetConfig.plugins.unshift(
          new ExtInfoPlugin(extInfo)
        );
      } else
        targetConfig.plugins.push(
          new WorkboxWebpackPlugin.GenerateSW(),
        );
    }

    if (pkg.library || !template) {
      const name = typeof pkg.library === "string"
        ? pkg.library
        : pkg.name.substring(pkg.name.indexOf("/") + 1);

      targetConfig.output.library = {
        ...(target === "module" ? {} : { name }),
        type: target,
      }

      targetConfig.output.libraryTarget = target;
      targetConfig.output.environment = { "const": true };
    }

    targetConfig.module.rules = config.module.rules.concat(getCodeRules(module, parser));
    configs.push(targetConfig);
  }

  if (mainPkg.outputConfig)
    fs.writeFileSync("/tmp/scripts.webpack.config.json", JSON.stringify(configs));

  return configs;
}
