const { getConfigs } = require("../getConfigs");
const esbuild = require("esbuild");
const pkg = require(process.cwd() + "/package.json");
const { execSync } = require('child_process');

const configs = getConfigs({});

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
  delete config.copyPatterns;
  esbuild.build(config);
}
