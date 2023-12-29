module.exports = {
  ignore: ["./node_modules"],
  exclude: ["./node_modules"],
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          "browsers": ["last 2 Chrome versions", "last 2 Firefox versions"],
          "node": "20"
        },
        exclude: ["transform-block-scoping"]
      }
    ],
    // "@babel/preset-typescript",
    "@babel/preset-react"
  ],
  plugins: [
    ["@babel/plugin-proposal-decorators", { legacy: true, loose: true }],
    ["@babel/plugin-proposal-class-properties", { loose: true }],
    ["@babel/plugin-transform-private-property-in-object", { loose: true }],
    ["@babel/plugin-transform-private-methods", { loose: true }],
    ["@babel/plugin-transform-class-properties", { loose: true }],
    [
      "@babel/plugin-transform-runtime",
      { useESModules: true, helpers: true }
    ]
  ]
};

