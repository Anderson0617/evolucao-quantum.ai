import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import App from "../src/App.jsx";

const html = renderToStaticMarkup(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log(html);
