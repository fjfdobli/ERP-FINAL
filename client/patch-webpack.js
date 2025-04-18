const fs = require('fs');
const path = require('path');

const webpackDevServerPath = path.resolve(
  __dirname, 
  'node_modules/react-scripts/node_modules/webpack-dev-server/client/index.js'
);

try {
  let content = fs.readFileSync(webpackDevServerPath, 'utf8');
  
  content = content.replace(
    /console\.warn\('onBeforeSetupMiddleware is deprecated'/,
    '// console.warn("onBeforeSetupMiddleware is deprecated")'
  );
  content = content.replace(
    /console\.warn\('onAfterSetupMiddleware is deprecated'/,
    '// console.warn("onAfterSetupMiddleware is deprecated")'
  );

  fs.writeFileSync(webpackDevServerPath, content);
  console.log('Webpack dev server warnings patched successfully');
} catch (error) {
  console.error('Failed to patch webpack-dev-server:', error);
}