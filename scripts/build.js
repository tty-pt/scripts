const { getConfigs } = require("../getConfigs");
const { webpack } = require("../webpack");
const esbuild = require("esbuild");
const pkg = require(process.cwd() + "/package.json");
const { execSync } = require('child_process');

const configs = getConfigs({});

let webpackConfigs = configs.webpack;
if (pkg.forceWebpack)
  webpackConfigs = configs.original;
else {
  for (const config of configs.esbuild) {
    if (config.outdir)
      for (const pattern of config.copyPatterns) {
        const source = process.cwd() + "/" + pattern.from;
        const destination = process.cwd() + "/" + config.outdir + "/" + pattern.to;

        execSync(`
          mkdir -p ${destination};
          cp -Lr ${source} ${destination}
        `);
      }
    delete config.globalExternal;
    delete config.copyPatterns;
    esbuild.build(config);
  }
}

if (webpackConfigs.length) {
  const compiler = webpack(webpackConfigs);

  compiler.run((err, stats) => {
    if (err)
      console.error(new Error(err));
    if (stats?.stats?.length)
      for (const item of stats.stats)
        for (const erro of item.compilation.errors)
          console.error(new Error(erro));
    else for (const erro of (stats?.compilation?.errors ?? []))
      console.error(new Error(erro));
  });
}
