test -z "$PREF" && PREF=../../apps
test -z "$APP" && APP=ide
pnpm link ../scripts $PREF/$APP/node_modules/react

