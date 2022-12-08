import setup from "react-noscripts";
import App from "./App";

setup(App, "./App", document.getElementById("root"), () => require("./App").default);
