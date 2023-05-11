const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");
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

const hasEslint = fs.existsSync(process.cwd() + "/.eslintrc.js");
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

// function _relsolve(pathName) {
//   return path.resolve(__dirname, "../..", pathName);
// }

// function scrsolve(pathName) {
//   return path.resolve(__dirname, "node_modules/@tty-pt/scripts/node_modules", pathName);
// }

function getDepModules() {
  return [
    "node_modules",
    "node_modules/@tty-pt/scripts/node_modules",
    "src"
  ].concat(Object.keys(scriptsPackage.dependencies).map(depModule));
}

const swcConfig = JSON.parse(fs.readFileSync(swcConfigPath, "utf-8"));

const defaultConfig = {
  entry: "./src/index.jsx",
  development: false,
  stringEntry: false,
  outputExtension: "js",
  template: "./public/index.html",
};

const scriptsConfig = {
  ...defaultConfig,
  ...(pkg?.["@tty-pt/scripts"] ?? {}),
};

const depModules = getDepModules();

module.exports = function makeConfig(env) {
  const { template, library, entry, stringEntry, outputExtension } = scriptsConfig;

  const development = env.development ?? scriptsConfig.development;
  
  const config = {
    mode: "production",
    entry: stringEntry ? entry : { main: [entry] },
    output: {
      filename: "static/js/[name]." + outputExtension,
      chunkFilename: "static/js/[name].chunk.js",
      assetModuleFilename: "static/media/[name].[hash][ext]",
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
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"].map(require.resolve),
        },
        {
          test: /\.(eot|ttf|woff|woff2)$/i,
          type: "asset",
        },
        // {
        //   test: /\.(png|svg)/i,
        //   use: ["file-loader"],
        // },
        {
          test: /\.png/i,
          use: ["file-loader"],
        },
        {
          test: /\.(svg|jpg|git)$/i,
          use: ["@svgr/webpack"],
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
        react: relsolve('node_modules/react'),
        "react-dom": relsolve('node_modules/react-dom'),
        // "@emotion/react": scrsolve('node_modules/@emotion/react'),
        // "@emotion/react": relsolve('node_modules/@emotion/react/dist/emotion-react.browser.esm.js'),
        // "@emotion/styled": relsolve('node_modules/@emotion/styled'),
        // "@types/node": path.resolve(process.cwd() + 'node_modules/@types/node'),
        // "@types/node": scrsolve('@types/node'),
        // "@types/node": relsolve('node_modules/@types/node'),
        // "@types/node": relsolve('node_modules/@types/node'),
        // "@types/react": relsolve('node_modules/@types/react'),
        // "@types/react-dom": relsolve('node_modules/@types/react-dom'),
        // "@mov-ai/mov-fe-lib-core": relsolve('libs/core'),
        // "@mov-ai/mov-fe-lib-react": relsolve('libs/mov-react'),
      },
      symlinks: true,
      // vscode: require.resolve(
      //   "@codingame/monaco-languageclient/lib/vscode-compatibility"
      // ),
    },
    externals: {},
  };

  if (development) {
    config.mode = "development";
    config.devtool = "inline-source-map";
  }

  if (library) {
    config.externals = libraryExternals();
    config.externalsType = "commonjs";
    // config.externalsType = "module";

    config.output.library = {
      name: pkg.name,
      type: "umd",
    };

    config.plugins.push(
      new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 })
    );

    config.experiments = {
      outputModule: true,
    };
  } else {
    config.plugins.push(new HtmlWebpackPlugin({ inject: true, template }));
    config.plugins.push(new IndexPlugin(development));

    if (development) {
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
