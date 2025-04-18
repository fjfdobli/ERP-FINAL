const webpack = require('webpack');

module.exports = function override(config) {
  const suppressWarnings = new webpack.DefinePlugin({
    'process.env.SUPPRESS_DEPRECATION_WARNINGS': JSON.stringify('true')
  });

  config.plugins.push(suppressWarnings);

  return config;
};