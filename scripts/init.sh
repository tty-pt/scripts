#! /bin/sh

temp="`mktemp "react-noscripts-XXXXXXX"`"

minstall() {
	ls node_modules > $temp
	sort | comm -23 - $temp | tr '\n' ' ' | xargs npm i --save-dev
}

if test -d "./node_modules"; then
	version=`cat package.json | grep '"react"' | awk '{print $2}' | sed 's/[^1-9]*\([1-9]*\).*/\1/'`
	minstall <<EOF
react-noscripts
@hot-loader/react-dom@$version
EOF
else
	if test ! -f "./package.json"; then
		npm init
	fi

	cp -r $__dirname/src $__dirname/public $__dirname/jsconfig.json $__dirname/.eslintrc.js .
	npm i --save-dev react-noscripts react@17 react-dom@17 @hot-loader/react-dom@17
fi

jq '.scripts.start = "react-noscripts start" | .scripts.build = "react-noscripts build" | .scripts.lint = "react-noscripts lint" | .scripts.test = "react-noscripts test"' package.json >$temp
mv $temp package.json

npx react-noscripts start
