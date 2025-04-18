const { execSync } = require('child_process');
const { startReactScripts } = require('react-scripts/scripts/start');

// Custom header function
function printProjectHeader() {
  console.log('==================================================');
  console.log('       SYSTEM INTEGRATION & ARCHITECTURE 2');
  console.log('==================================================');
  console.log('\nProponents:');
  console.log('- Dobli, Ferdinand John F.');
  console.log('- Espinosa, Eriel John Q.');
  console.log('- Operario, Raphael Miguel D.');
  console.log('\n==================================================\n');
}

// Override the start function
function customStart() {
  printProjectHeader();
  startReactScripts();
}

customStart();