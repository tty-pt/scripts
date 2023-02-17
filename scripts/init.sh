#! /bin/sh

temp="`mktemp "/tmp/tty-pt-scripts-XXXXXXX"`"
name="@tty-pt/scripts"
react_version="17"

if test $# -ge 1; then
	react_version=$#
fi

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

	echo -n "Use typescript? "
	read y

	cp -r $__dirname/src $__dirname/public $__dirname/index.html $__dirname/.eslintrc.js .

	if [[ "$y" == "y" ]]; then
		cp $__dirname/sconfig ./tsconfig.json
		jq ".scripts.start = \"scripts start\" | .scripts.build = \"scripts build\" | .scripts.watch = \"scripts watch\" | .scripts.lint = \"scripts lint\" | .scripts.test = \"scripts test\"" .eslintrc >$temp
	else
		cp $__dirname/sconfig ./jsconfig.json
	fi

	sconfig="`read y; [[ "$y" == "y" ]] && echo "t" || echo "j"`sconfig"
	cp $__dirname/sconfig ./$sconfig.json
	npm i --save-dev @tty-pt/scripts react@$react_version react-dom@$react_version @hot-loader/react-dom@$react_version
fi

jq ".scripts.start = \"scripts start\" | .scripts.build = \"scripts build\" | .scripts.watch = \"scripts watch\" | .scripts.lint = \"scripts lint\" | .scripts.test = \"scripts test\"" package.json >$temp
mv $temp package.json

npx scripts start
