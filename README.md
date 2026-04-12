# @tty-pt/scripts

esbuild-based build tool configured via `package.json`.

## Installation

```sh
pnpm add -D @tty-pt/scripts
```

## Usage

Add to your `package.json`:

```json
{
  "scripts": {
    "build": "scripts build"
  }
}
```

Then run:

```sh
pnpm build
```

## Output formats

The output formats produced are determined by which fields you define in `package.json`:

| Field | Format |
|---|---|
| `main` | CommonJS (`.cjs`) |
| `module` | ESM (`.mjs`), one file per source file |
| `browser` | IIFE (`.js`) |

Example:

```json
{
  "main": "dist/index.cjs",
  "module": "dist/index.mjs",
  "browser": "dist/index.js",
  "entry": "./src/index.tsx"
}
```

## `package.json` properties

### `entry`
Entry point of your library or application. Can be a string or an object for multiple entry points.

```json
{ "entry": "./src/index.tsx" }
```

### `library`
Global name exported by the IIFE bundle. Set to a string (the global variable name) or `true` to derive it from the package name.

```json
{ "library": "MyLib" }
```

### `template`
Path to an HTML template file. Enables app build mode — esbuild will produce an `index.html` with scripts injected.

```json
{ "template": "index.html" }
```

### `external`
Dependencies to exclude from the bundle. Values follow webpack externals syntax — use a `window.` or `global.` prefix to map to a global variable, or a `module ` prefix to treat as an ESM external.

```json
{
  "external": {
    "react": "window.React",
    "react-dom": "window.ReactDOM"
  }
}
```

### `cdn`
Controls how externals are resolved to URLs for injection into the HTML template. Keys are dependency names.

- `true` — resolve automatically via `https://unpkg.com/$NAME@$VERSION`
- A path string — appended to the CDN prefix (e.g. `"umd/react.production.min.js"`)
- A full URL — used as-is
- `cdn.default` — override the default CDN prefix template, or set to `false` to use local `node_modules`

```json
{
  "cdn": {
    "default": "https://cdn.skypack.dev/$NAME@$VERSION",
    "react": "umd/react.production.min.js"
  }
}
```

### `publicPath`
Public path for assets in production builds. Defaults to `/`.

```json
{ "publicPath": "/static/" }
```

### `development`
Set to `true` to build in development mode (no minification, no source maps).

```json
{ "development": true }
```

### `outputConfig`
Set to `true` to write the resolved esbuild config to `/tmp/scripts.config.json` for debugging.

## Advanced: overriding `base-config.js`

Place a `base-config.js` in your project root to extend or replace the default config resolution:

```js
const makeConfigs = require("@tty-pt/scripts/base-config");

module.exports = function(env) {
  const configs = makeConfigs(env);
  // modify configs here
  return configs;
};
```
