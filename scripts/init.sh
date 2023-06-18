#! /bin/sh

temp="`mktemp "/tmp/tty-pt-scripts-XXXXXXX"`"
name="@tty-pt/scripts"
react_version="18"

if test $# -ge 1; then
	react_version=$#
fi

minstall() {
	ls node_modules > $temp
	sort | comm -23 - $temp | tr '\n' ' ' | xargs pnpm add -D
}

if test -d "./node_modules"; then
	version=`cat package.json | grep '"react"' | awk '{print $2}' | sed 's/[^1-9]*\([1-9]*\).*/\1/'`
	echo @tty-pt/scripts | minstall
else
	if test ! -f "./package.json"; then
		npm init
	fi

	echo -n "Parser [swc]: "
	read parser

	if test "$parser" != "babel"; then
		parser=swc
	fi

	echo -n "Use typescript? "
	read y

	cp -r $__dirname/src $__dirname/public $__dirname/index.html .
	ln -s $__dirname/.eslintrc.js .
	ln -s $__dirname/sconfig.json ./tsconfig.json
	pnpm add -D @tty-pt/scripts react@^$react_version react-dom@^$react_version
fi

jq "[@tty-pt/scripts] = { parser: \"$parser\" } | .scripts.start = \"scripts start\" | .scripts.build = \"scripts build\" | .scripts.watch = \"scripts watch\" | .scripts.lint = \"scripts lint\" | .scripts.test = \"scripts test\"" package.json >$temp
mv $temp package.json

pnpm start
