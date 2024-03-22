# @tty-pt/scripts
> Less than react scripts

This library is similar to react-scripts, in that it gives you default configurations you can use to build, watch, test, storybook, lint and develop your projects.

However, in it there's an effort to make customization and configuration as simple and flexible as possible.

For example, a lot of things can be customized via simple package.json properties, or we can even provide the original configuration files for each of its constituent parts. We can easily override webpack.config.js, and others, or we can make use of the defaults, or a mix of both. Without need for additional dependencies.

Additionally, it is faster than react-scripts. And it can save you having to specify all this devDependencies in your own projects. And from a lot of boilerplate.

As an example, I'm using pnpm as a package manager. But you can do the equivalent thing with npm.

# Init Project or auto-add to existing project
> Start new project / add to existing project
```sh
pnpm dlx @tty-pt/scripts init # and follow the instructions
```

# Other Scripts
These are some of the common scripts we can run. Don't forget to have a corresponding "script" in your package.json, with the value set to "scripts \<script-name\>".

## build
> Build the project

## start
> Start the development server (for apps)

## watch
> Watch and auto-build (for libraries)

## lint
> Lint project

## test
> Test project

## storybook
> Run storybook

# Simple Configuration
Configuration is meant to be as easy as possible. Without the need to dwelve into the complexities of the different tooling needed to build the project. It should, in most cases, be a matter of adding a couple of properties to package.json.

Some standard ones are also used to inform scripts about your project. Like "main" and others like it. Scripts knows how to build your projects to multiple module formats if you provide it with these kinds of properties.

## entry
This property specifies the entry point of your library or application. An example of it would be "./src/index.js".

## template
In case you are dealing with an application, or a library that also has an app, you can specify the "template" property. It lets you say which html template to use for the app.

## library
If you are building a library, you can use this property to specify its name. Meaning, the global object it may export to.

You can also set this to "true", and it will use something akin to the package name. But in most cases, you shouldn't need to.

## parser
You can use this property to specify the transpiler. Some possible values are: "swc", "babel" or "esbuild". If a ".swcrc" is present, scripts will know to use swc, and you don't have to do this. Likewise if babel.config.js is present.

## minimizer
This property can be used to specify the minimizer. It can be "swc", "esbuild" or "terser". By default, "esbuild" is used.

## publicPath
You can use this property to specify the publicPath of your application in production mode.

## development
You can use this (with a value of "true")  so that scripts will build your thing in development mode, and not minify.

## external
This should be an object, in which each key is a library name, and the values are externals. You can specify these [the same way you'd specify externals in webpack](https://webpack.js.org/configuration/externals/#string).

## cdn
With this, you can specify an entry point for your externals. For example, react's umd entry point is usually "umd/react.production.min.js".

This is also supposed to be an object in which keys are dependency names, and values are things like this. They can also be "true".

If they are true, they will resolve automatically and use the default CDN.

You can also prepend every value with a string like: `https://cdn.skypack.dev/$NAME@$VERSION`.

And override the default cdn by setting cdn.default.

## serve
This should be an array of strings, indicating which folders should be served by the development server.

## stats
Use this to output webpack stats to `/tmp/scripts.stats.json`.

## outputConfig
Set this to "true" to output the generated webpack configuration to `/tmp/scripts.webpack.config.json`.

# Advanced Configuration
In many situations, you don't have to do much. You can just set the package.json properties mentioned in the "Simple Configuration" section.

However, if you wish to have more granular control, you can also provide your own configuration files. Or link those provided by scripts.

## webpack
If you wish to customize webpack, you can do something like:
```js
const makeConfigs = require("@tty-pt/scripts/webpack.config");
const CustomWebpackPlugin = require("./custom-webpack-plugin");

module.exports = function (env) {
	const configs = makeConfigs(env);
	for (const config of configs)
		config.plugins.push(new CustomWebpackPlugin());
	return configs;
};
```
For example.

## swc
As stated, we're using swc under the hood, which can be configured using ".swcrc".

## jest
Jest can be configured via "jest.config.json".

## eslint
Can be configured using ".eslintrc.js".

## typescript
You can configure it via "tsconfig.json".

## express
Express can be configured via "src/setupProxy.js".

# Examples
- [@tty-pt/ndc](https://github.com/tty-pt/ndc/blob/main/package.json)
- [@tty-pt/styles](https://github.com/tty-pt/styles/blob/main/package.json)
- [@tty-pt/types](https://github.com/tty-pt/types/blob/main/package.json)
- [@tty-pt/sub](https://github.com/tty-pt/sub/blob/main/package.json)
- [neverdark](https://github.com/quirinpa/neverdark/blob/main/package.json)
- [@mov-ai/mov-fe-lib-core](https://github.com/MOV-AI/frontend-npm-lib-core/blob/dev/package.json)
- [@mov-ai/mov-fe-lib-react](https://github.com/MOV-AI/frontend-npm-lib-react/blob/dev/package.json)
- [@mov-ai/mov-fe-lib-code-editor](https://github.com/MOV-AI/frontend-npm-lib-code-editor/blob/dev/package.json)
- [@mov-ai/mov-fe-lib-ide](https://github.com/MOV-AI/frontend-npm-lib-ide/blob/dev/package.json)
