const React = require("react");
const ReactDOM = require("react-dom");

export default function setup(App, appPath, rootElement, hotCallback) {
  function render(App) {
    ReactDOM.render(React.createElement(App, null, null), rootElement);
  }

  render(App);

  if (module.hot)
    module.hot.accept(appPath, render(hotCallback()));
}
