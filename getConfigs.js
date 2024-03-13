const { makeConfig } = require("./webpack");
const pkg = require(process.cwd() + "/package.json");
const { externalGlobalPlugin } = require("esbuild-plugin-external-global");
const fg = require("fast-glob");

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

module.exports = function getConfigs(env) {
  const origConfigs = makeConfig(env);

  const configs = {
    original: origConfigs,
    esbuild: [],
    webpack: [],
  };

  for (const config of origConfigs) {
    const libType = config.plugins[0].extInfo.type ?? "module";
    const globExt = config.plugins[0].extInfo.externals;
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
      const usesOutdir = typeof pkg.entry !== "string" || libType === "module" || env.server;
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
          '.woff': 'file',
          '.woff2': 'file',
          '.eot': 'file',
          '.ttf': 'file',
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
        publicPath: "./",
        metafile: true,
        // external: bundle ? otherExternals.concat(globalExternals.map(([key]) => key)) : undefined,
        external: bundle ? otherExternals : undefined,
        globalExternal: env.server ? globExt : undefined,
        plugins: bundle ? [
          externalGlobalPlugin(globalExternals
            .reduce((a, [key, value]) => ({ ...a, [key]: 'globalThis.' + value, }), {})
          ),
        ] : [],
      };

      configs.esbuild.push(esConfig);
    } else
      configs.webpack.push(config);
  }

  return configs;
}
