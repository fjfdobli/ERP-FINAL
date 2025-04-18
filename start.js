console.log('SYSTEM INTEGRATION & ARCHITECTURE 2');

console.log('\nProponents:');
console.log('- Dobli, Ferdinand John F.');
console.log('- Espinosa, Eriel John Q.');
console.log('- Operario, Raphael Miguel D.');

const { spawn } = require('child_process');

const server = spawn('npm', ['run', 'server'], { stdio: 'inherit' });

const client = spawn('npm', ['run', 'client'], { stdio: 'inherit' });

process.on('SIGINT', () => {
  server.kill();
  client.kill();
  process.exit();
});