process.env.GENERATE_SOURCEMAP = 'false';
process.env.DISABLE_ESLINT_PLUGIN = 'true';

const originalEmit = process.emit;
process.emit = function (name, data, ...args) {
  if (
    name === 'warning' &&
    (data.name === 'DeprecationWarning') &&
    (
      data.message.includes('onAfterSetupMiddleware') || 
      data.message.includes('onBeforeSetupMiddleware')
    )
  ) {
    return false;
  }
  return originalEmit.apply(process, [name, data, ...args]);
};