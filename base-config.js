const path = require("path");
const fs = require("fs");
const pkg = require(process.cwd() + "/package.json");
const mainPkg = pkg;
const scriptsPackage = require("./package.json");
const cdn = mainPkg.cdn ?? {};

for (const key in mainPkg.external)
  if (!cdn[key])
    cdn[key] = true;

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

const cwd = process.cwd();

const order = ["unpkg", "main:umd", "module", "browser", "main"];

function getImports(imports, path, pkg, explicit, depth = 0) {
  const extKeys = Object.keys(pkg.external ?? {});
  depth ++;

  for (const dep of extKeys) {
    if (imports[dep]) {
      if (depth > imports[dep].depth)
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

    if (!fs.existsSync(depPkgPath)) {
      const res = require.resolve(dep);
      depPkgPath = res.substring(0, res.lastIndexOf(dep)) + dep + "/package.json";
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
  'main': 'commonjs',
  'browser': 'iife',
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
  let prefix;
  let ord = "main";
  const cdnPrefix = cdn.default === false
    ? "./node_modules/$NAME"
    : (cdn.default ?? "https://unpkg.com/$NAME@$VERSION");

  if (typeof cdn[key] === "string") {
    const baseCdn = cdn[key];
    const local_cdn = (baseCdn.substring(0, 4) === "http"
      ? baseCdn
      : cdnPrefix + "/" +  baseCdn
    ).replace("$NAME", key).replace("$VERSION", imports[key].pkg.version);
    return [glob, local_cdn, undefined, "browser"];
  } else if (cdn[key])
    prefix = cdnPrefix.replace("$NAME", key).replace("$VERSION", imports[key].pkg.version);
  else
    prefix = "./node_modules/" + key;

  for (ord of order) {
    if (ord === "module" && extType !== "module")
      continue;
    else if (imp[ord]) {
      const type = (ordType[ord] ?? ord);
      path = glob ? glob : (type === extType ? "" : type  + " ");
      entry = imp[ord];
      ord = ord;
      break;
    }
  }

  if (!entry) {
    entry = imp.pkg.exports["./" + key.substring(imp.pkg.name.length + 1)];
    path = glob;
  }

  return [
    path,
    prefix + "/" + entry,
    entry,
    ord
  ]
}

function moduleExtProc(key, imp, extType) {
  const prefix = extType === "module" ? "" : "module ";
  if (imp.pkg.module)
    return [prefix + key, imp.path + imp.pkg.module, imp.pkg.module, "module"];
  else if (cdn[key]) {
    const local_cdn = cdn[key]
      .replace("$NAME", dep).replace("$VERSION", depPkg.version);
    return [prefix + key, local_cdn, undefined, "browser"];
  } else
    return otherExtProc(key, imp, extType);
}

module.exports = function makeConfig(env) {
  const {
    development = env.development,
    targets = [],
    template,
  } = pkg;

  const entry = pkg.entry ? (typeof pkg.entry === "string" ? "./" + pkg.entry : pkg.entry) : "./src/index.jsx";

  const publicPath = env.server ? "/" : (pkg.publicPath ? pkg.publicPath : "/node_modules/" + pkg.name + "/dist/");

  const config = {
    mode: development ? "development" : "production",
    entry: {},
    output: {
      filename: '[name].js', // overwritten
      path: path.resolve(process.cwd() + "/" + dist),
      globalObject: "globalThis",
      publicPath,
    },
    target: "web",
    externalsType: "umd",
    resolve: {
      alias: {
        ...(Object.entries(cdn)
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
    },
    optimization: {
      minimize: !development,
      usedExports: false,
    },
  };

  if (development) {
    config.mode = "development";
  }

  function getFilename(field) {
    const splits = field.split("/");
    const newSplits = splits[splits.length - 1].split(".");
    newSplits.pop();
    return newSplits.join(".");
  }

  if (pkg.module && !pkg["!module"])
    targets.push("module");

  if (pkg.main)
    targets.push("commonjs");

  if (pkg.browser)
    targets.push("iife");

  let configs = [];

  for (const target of targets) {
    let lname = pkg.main;
    let module = false;

    const targetConfig = {
      ...config,
      entry: {},
      output: { ...config.output },
    };

    switch (target) {
      case "amd": lname = pkg.amd; break;
      case "iife": lname = pkg.browser; break;
      case "module":
        module = true;
        lname = pkg.module;
        break;
    }

    const filename = getFilename(lname);
    if (typeof entry === "string")
      targetConfig.entry[filename] = entry;
    else {
      const newEntry = { ...entry };
      const mainEntry = newEntry.main;
      delete newEntry.main;
      newEntry[filename] = mainEntry;
      target.entry = newEntry;
    }

    const targetImports = {};
    const copyPatterns = [];
    const extInfo = [];

    if (fs.existsSync(process.cwd() + "/public"))
      copyPatterns.push({ from: "public/*", to: "" });

    for (const dep in imports) {
      if (!mainPkg.external?.[dep])
        continue;
      const isModule = mainPkg.external?.[dep].substring(0, 7) === "module ";
      const extProc = isModule ? moduleExtProc : otherExtProc;
      const [key, value, entry, ord] = extProc(dep, imports[dep], targetConfig.externalsType);
      if (value) {
        targetImports[dep] = { path: value, ord };
      }

      if (pkg.template)
        extInfo.push([dep, key, value, entry, ord]);

      if (value.substring(0, 4) === "http" || env.server)
        continue;

      const from = path.dirname(value);
      copyPatterns.push({
        from,
        to: path.dirname(from) + "/",
      });
    }

    targetConfig.extInfo = {
        externals: extInfo,
        type: target,
        copyPatterns,
    };

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

    configs.push(targetConfig);
  }

  if (mainPkg.outputConfig)
    fs.writeFileSync("/tmp/scripts.config.json", JSON.stringify(configs));

  return configs;
}
