const { webpack, makeConfig } = require("../webpack");
const compiler = webpack(makeConfig({}));

compiler.run((err, stats) => {
  if (err)
    console.error(new Error(err));
  if (stats.stats)
    for (const item of stats.stats)
      for (const erro of item.compilation.errors)
        console.error(new Error(erro));
  else for (const erro of item.compilation.errors)
    console.error(new Error(erro));
});
