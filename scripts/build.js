const { getConfigs, getDist } = require("../getConfigs");
const fs = require("fs-extra");
const path = require("path");
const { webpack } = require("../webpack");
const esbuild = require("esbuild");
const { bias } = require("../bias");
const pkg = require(process.cwd() + "/package.json");
const ts = require("typescript");

function tscompile() {
  const configFile = ts.readConfigFile(bias('tsconfig.json'), ts.sys.readFile);
  if (configFile.error)
    throw new Error(ts.formatDiagnostics([configFile.error], ts.createCompilerHost({})));

  configFile.config.compilerOptions.outDir = getDist(pkg.types);

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, './');
  if (parsed.errors.length > 0)
    throw new Error(ts.formatDiagnostics(parsed.errors, ts.createCompilerHost({})));

  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const emitResult = program.emit();
  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      console.log(`${path.relative(process.cwd(), diagnostic.file.fileName)} (${line + 1},${character + 1}): ${message}`);
    } else
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  });
}

if (pkg.types)
  tscompile();

const configs = getConfigs({});

let webpackConfigs = configs.webpack;
if (pkg.forceWebpack)
  webpackConfigs = configs.original;
else {
  for (const config of configs.esbuild) {
    if (config.outdir)
      for (const pattern of config.copyPatterns)
        fs.copySync(
          process.cwd() + "/" + pattern.from,
          process.cwd() + "/" + config.outdir + "/" + pattern.to
        );
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
