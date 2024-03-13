const getConfigs = require("../getConfigs");
const { webpack } = require("../webpack");
const esbuild = require("esbuild");
const pkg = require(process.cwd() + "/package.json");

const configs = getConfigs({});

let webpackConfigs = configs.webpack;
if (pkg.forceWebpack)
  webpackConfigs = configs.original;
else
  for (const config of configs.esbuild) {
    delete config.globalExternal;
    esbuild.build(config);
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
