module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          chrome: "78",
          node: "12",
          esmodules: true
        }
      }
    ],
    "@babel/preset-react"
  ],
  plugins: [
    ["@babel/plugin-proposal-class-properties", { loose: true }],
    ["@babel/plugin-proposal-decorators", { legacy: true, loose: true }],
    ["@babel/plugin-transform-class-properties", { loose: true }],
    ["@babel/plugin-transform-private-property-in-object", { loose: true }],
    ["@babel/plugin-transform-private-methods", { loose: true }],
  ]
};

