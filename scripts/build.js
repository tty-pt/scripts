const { webpack, makeConfig } = require("../webpack");
const compiler = webpack(makeConfig({}));

compiler.run((err, stats) => {
  if (err)
    throw new Error(err);

  if (stats.compilation.errors.length)
    throw new Error(stats.compilation.errors[0]);
});
