const nodeExternals = require('webpack-node-externals');

module.exports = function (options, webpack) {
  return {
    ...options,
    externals: [
      nodeExternals({
        // IMPORTANT: Whitelist your local monorepo packages so they ARE bundled.
        // Everything else stays external (loaded from node_modules).
        allowlist: [/^@agora/], 
      }),
    ],
  };
};
