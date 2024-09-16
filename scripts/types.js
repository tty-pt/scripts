const { getDist } = require("../getConfigs");
const path = require("path");
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

tscompile();
