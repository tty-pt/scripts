const { webpack, makeConfig } = require("../webpack");
const compiler = webpack(makeConfig({}));

compiler.run((err, stats) => {
  if (err)
    throw new Error(err);

  if (stats.stats) {
    for (const item of stats.stats)
      if (item.compilation.errors.length)
        throw new Error(item.compilation.errors[0]);
  } else if (stats.compilation.errors.length)
    throw new Error(stats.compilation.errors[0]);
});
