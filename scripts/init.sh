#! /bin/sh

temp="`mktemp "/tmp/tty-pt-scripts-XXXXXXX"`"
name="@tty-pt/scripts"

minstall() {
	ls node_modules > $temp
	sort | comm -23 - $temp | tr '\n' ' ' | xargs npm i --save-dev
}

if test -d "./node_modules"; then
	version=`cat package.json | grep '"react"' | awk '{print $2}' | sed 's/[^1-9]*\([1-9]*\).*/\1/'`
	minstall <<EOF
@tty-pt/scripts
@hot-loader/react-dom@$version
EOF
else
	if test ! -f "./package.json"; then
		npm init
	fi

	cp -r $__dirname/src $__dirname/public $__dirname/jsconfig.json $__dirname/.eslintrc.js .
	npm i --save-dev @tty-pt/scripts react@17 react-dom@17 @hot-loader/react-dom@17
fi

jq ".scripts.start = 'scripts start' | .scripts.build = 'scripts build' | .scripts.watch = 'scripts watch' | .scripts.lint = 'scripts lint' | .scripts.test = 'scripts test'" package.json >$temp
mv $temp package.json

npx scripts start
