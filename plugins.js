const HtmlWebpackPlugin = require("html-webpack-plugin");

class IndexPlugin {
  constructor(publicPath) {
    this.publicPath = publicPath.substring(0, publicPath.length - 1);
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('IndexPlugin', compilation => {
      HtmlWebpackPlugin
        .getHooks(compilation)
        .afterTemplateExecution.tap('IndexPlugin', data => {
          data.html = data.html.replace(
            new RegExp('%PUBLIC_URL%', 'g'),
            this.publicPath
          );
          // ).replace(new RegExp("\"./", "g"), this.publicPath);
        });
    });
  }
}

class ImportsPlugin {
  constructor(imports, module, publicPath) {
    this.importMap = { imports: Object.entries(imports).reduce((a, [key, value]) => ({ ...a, [key]: value.path }), {}) };
    this.imports = imports;
    this.module = module;
    this.publicPath = publicPath;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('ImportMapPlugin', (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(
        'ImportsPlugin',
        (data, cb) => {
          let str = "";
          const position = data.html.indexOf('<script');
          if (this.module)
            str += `<script type="importmap">${JSON.stringify(this.importMap)}</script>`;
          for (const dep in this.imports) {
            const imp = this.imports[dep];
            const typeStr = imp.module ? `type="module"` : "";
            const rootDir = imp.path.substring(0, "4") === "http" ? "" : this.publicPath;
            str += `<script ${typeStr} src="${rootDir}${imp.path}"></script>`;
          }
          data.html = data.html.substring(0, position)
            + str
            + data.html.substring(position);
          cb(null, data);
        }
      );
    });
  }
}

module.exports = { IndexPlugin, ImportsPlugin };

