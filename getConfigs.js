const { makeConfig } = require("./webpack");
const fs = require("fs");
const pkg = require(process.cwd() + "/package.json");
const { externalGlobalPlugin } = require("esbuild-plugin-external-global");
const { htmlPlugin } = require('@craftamap/esbuild-plugin-html');
const { copy } = require('esbuild-plugin-copy');
const fg = require("fast-glob");

function injectExternals(template, externals, publicPath) {
  let htmlContent = template;

  const scripts = externals.map(([_dep, _key, url, _entry, ord]) =>
    `<script ${ord === "module" ? "type=\"module\"" : ""} src="${url.substring(0, 4) === "http" ? url : publicPath + url}"></script>`
  ).join('');

  htmlContent = htmlContent.replace('</body>', `${scripts}</body>`);
  htmlContent = htmlContent.replaceAll(
    '%PUBLIC_URL%',
    publicPath.substring(0, publicPath.length - 1),
  );

  return htmlContent;
}

function getDist(filename) {
  const distSplits = filename.split("/");
  distSplits.pop();
  return distSplits.join("/");
}

const esbuildTypes = {
  "commonjs": {
    extension: 'cjs',
    bundle: true,
    format: "cjs",
    outfile: pkg.main,
    output: "main",
  },
  "iife": {
    extension: 'js',
    bundle: true,
    format: "iife",
    outfile: pkg.browser,
    key: "browser",
  },
  "module": {
    extension: 'mjs',
    format: "esm",
    outfile: pkg.module,
    key: "module",
  },
};

function toEntry(path) {
  const file = path.substring(path.lastIndexOf("/") + 1);
  return file.substring(0, file.lastIndexOf("."));
}

function getConfigs(env) {
  const origConfigs = makeConfig(env);

  const configs = {
    original: origConfigs,
    esbuild: [],
    webpack: [],
  };

  for (const config of origConfigs) {
    const libType = config.plugins[0].extInfo.type ?? "module";
    const globalExternal = config.plugins[0].extInfo.externals;
    const copyPatterns = libType === "iife" && pkg.template
      ? config.plugins[0].extInfo.copyPatterns : [];
    const type = esbuildTypes[libType];
    const externals = Object.entries(config.externals ?? {});
    const otherExternals = [];
    const globalExternals = [];

    for (const [key, value] of externals) {
      let io = value.indexOf('.');
      if (io < 0)
        io = value.indexOf(' ');
      let realValue = value;
      let isGlobal = true;

      if (io >= 0) {
        const prefix = value.substring(0, io);
        realValue = value.substring(io + 1);
        isGlobal = prefix === "window" || prefix === "global";
      }

      if (isGlobal)
        globalExternals.push([key, realValue]);
      else
        otherExternals.push(key);
    }

    if (type) {
      const { format, bundle, outfile } = type;
      const dist = getDist(outfile);
      const usesOutdir = typeof pkg.entry !== "string" || libType === "module" || pkg.template;
      const mainEntry = pkg.entry.main;
      const entry = typeof pkg.entry === "string" ? pkg.entry : { ...pkg.entry };
      delete entry.main;

      const esConfig = {
        entryPoints: format === "esm" ? fg.sync([
          "src/**/*.(ts|tsx|js|jsx)",
          "!src/**/*.test.(ts|tsx|js|jsx)",
        ]) : typeof pkg.entry === "string" ? [pkg.entry] : {
          ...entry,
          [toEntry(outfile)]: mainEntry,
        },
        bundle,
        outfile: usesOutdir ? undefined : outfile,
        outdir: usesOutdir ? dist : undefined,
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment',
        sourcemap: config.mode === "production",
        minify: config.mode === "production",
        alias: bundle ? config.resolve.alias : undefined,
        loader: {
          '.png': 'dataurl',
          '.svg': 'dataurl',
          '.woff': 'dataurl',
          '.woff2': 'dataurl',
          '.eot': 'dataurl',
          '.ttf': 'dataurl',
          '.css': format === "cjs" ? "empty": "css",
          '.js': 'jsx',
          '.jsx': 'jsx',
          '.ts': 'tsx',
          '.tsx': 'tsx',
        },
        format,
        globalName: config.output.library?.name,
        // publicPath: (
        //   "./lib/" + pkg.name + "/" + dist + "/"
        // ),
        publicPath: env.server ? "/" : !pkg.template || pkg.library ? "" : (
          pkg.publicPath ? pkg.publicPath : "/node_modules/" + pkg.name + "/" + dist + "/"
        ),
        metafile: true,
        // external: bundle ? otherExternals.concat(globalExternals.map(([key]) => key)) : undefined,
        external: format === "cjs" ? otherExternals.concat(globalExternals.map(([key]) => key)) : undefined,
        globalExternal,
        copyPatterns,
        plugins: bundle ? (format === "cjs" ? [] : [
          externalGlobalPlugin(globalExternals
            .reduce((a, [key, value]) => ({ ...a, [key]: 'globalThis.' + value, }), {})
          ),
        ]) : [
          copy({
            assets: [{
              "from": ["./src/**/*.css", "./src/**/*.woff"],
              "to": ["."],
            }],
          }),
        ],
      };

      if (pkg.template) {
        esConfig.plugins.push(htmlPlugin({
          files: [{
            entryPoints: [pkg.entry],
            htmlTemplate: injectExternals(
              fs.readFileSync(process.cwd() + "/" + pkg.template, "utf-8"),
              esConfig.globalExternal,
              env.server ? "." : esConfig.publicPath
            ),
            filename: "index.html",
            scriptLoading: libType === "module" ? "module": undefined,
          }]
        }));
      }

      configs.esbuild.push(esConfig);
    } else
      configs.webpack.push(config);
  }

  return configs;
}

module.exports = { getConfigs, getDist };
