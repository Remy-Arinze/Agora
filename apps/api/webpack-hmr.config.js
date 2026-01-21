const nodeExternals = require('webpack-node-externals');

module.exports = function (options) {
  return {
    ...options,
    // This tells Webpack: "If it's in node_modules, don't bundle it"
    externals: [
      nodeExternals(),
    ],
  };
};