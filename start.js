// For macOS and Linux
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

// For Windows OS
/* 
console.log('SYSTEM INTEGRATION & ARCHITECTURE 2');

console.log('\nProponents:');
console.log('- Dobli, Ferdinand John F.');
console.log('- Espinosa, Eriel John Q.');
console.log('- Operario, Raphael Miguel D.');

const { spawnSync } = require('child_process');

const server = spawnSync('npm', ['run', 'server'], { stdio: 'inherit', shell: true });
const client = spawnSync('npm', ['run', 'client'], { stdio: 'inherit', shell: true });

if (server.error) {
    console.error('Error with server process:', server.error);
}

if (client.error) {
    console.error('Error with client process:', client.error);
}
*/