module.exports = {
  "settings": {
    "react": {
      "version": "detect",
    },
  },
	"env": {
		"browser": true,
		"es2021": true,
    "jest": true
	},
	"extends": [
		"eslint:recommended",
		"plugin:react/recommended"
	],
	"overrides": [
	],
	"parserOptions": {
		"ecmaVersion": "latest",
		"sourceType": "module"
	},
	"plugins": [
		"react"
	],
	"rules": {
		"indent": [
			// "error",
			"warn",
			2
		],
		"linebreak-style": [
			"error",
			"unix"
		],
    "quotes": [
      // "error",
			"warn",
			"double"
		],
		"semi": [
			// "error",
			"warn",
			"always"
		],
 		"react/display-name": 2,
 		"no-empty": ["error", { "allowEmptyCatch": true }]
	},
  "ignorePatterns": [
    "src/i18n/i18next-scanner.config.js",
    "src/serviceWorker.js",
    "src/setupProxy.js"
  ]
};
