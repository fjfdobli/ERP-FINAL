/// <reference types="react-scripts" />

// Suppress specific deprecation warnings
const { WebpackDevServer } = require('webpack-dev-server');
if (WebpackDevServer.prototype.setupMiddlewares) {
  const originalSetupMiddlewares = WebpackDevServer.prototype.setupMiddlewares;
  WebpackDevServer.prototype.setupMiddlewares = function(middlewares, devServer) {
    // Temporary noop to suppress deprecation warnings
    return middlewares;
  };
}