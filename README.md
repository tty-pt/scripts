# @tty-pt/scripts
> Less than react scripts

This library is similar to react-scripts (from create-react-app), in that it gives you default<br />
configurations you can use to build, watch, test, storybook, lint and develop your projects.

Unlike react-scripts, "@tty-pt/scripts" allows you to configure each of its constituent parts<br />
via its respective configuration with a bit more ease, for example it is quite easy to customize you "webpack.config.js".

Currently swc is used for compilation, which can be done in conjunction with packing.<br />
But we are considering adding babel / typescript build types. Not guaranteed.

# Scripts

## Init
> Start new project / add to existing project
```sh
pnpm dlx @tty-pt/scripts init # and follow the instructions
```

## Build
> Build project (usually production build)
```sh
pnpm build
```

## Start
> Start project (development mode for apps)
```sh
pnpm start
```

## Watch
> Watch source files (useful for auto-building libraries)
```sh
pnpm watch
```

## Lint
> Lint project
```sh
pnpm lint
```

## Test
> Test project
```sh
pnpm test
```

## storybook
> Run storybook
```sh
pnpm storybook
```

# Configuration
There is a new "@tty-pt/scripts" that you can add to package.json to configure scripts. Here's an example of that:
```json
	(...)
	"name": "my-lib",
	"main": "dist/index.js",
	"@tty-pt/scripts": {
		"entry": "src/index.js",
		"development": true, # don't minify
		"library": true
	},
	(...)
```
With this set up, you are good to try to use scripts.

In most situations it should be enough to symlink scripts' default configuration files.

## webpack
Webpack can be configured the usual way (via webpack.config.js).<br />
But we provide a default configuration so that you can skip all that.

Here's the simplest example of a valid webpack.config.js:
```js
module.exports = rquire("@tty-pt/scripts/webpack.config");
```

If you wish to customize webpack, you can do:
```js
const makeConfig = require("@tty-pt/scripts/webpack.config");
const CustomWebpackPlugin = require("./custom-webpack-plugin");

module.exports = function (env) {
	const config = makeConfig(env);
	config.plugins.push(new CustomWebpackPlugin());
	return config;
};
```
For example.

## swc
As stated, we're using swc under the hood, which can be configured using ".swcrc".

## jest
Jest can be configured via "jest.config.json".

## eslint
Although nor the build nor the start scripts run eslint, you can still access it via "pnpm lint".<br />
You should also have access to it in your editor.

It can be configured using ".eslintrc.js".

## typescript
Although typescript is not being used for compilation, we provide it so code editors may still make use of it.

You can configure it via "tsconfig.json".

## express
Express can be configured via "src/setupProxy.js".
