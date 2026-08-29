const fs = require('fs');
const path = require('path');

const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const topology = fs.readFileSync(path.join(__dirname, 'topology.json'), 'utf8');
const scenarios = fs.readFileSync(path.join(__dirname, 'scenarios.json'), 'utf8');

const output = template
  .replace('__TOPOLOGY__', topology)
  .replace('__SCENARIOS__', scenarios);

fs.writeFileSync(path.join(__dirname, 'workbench.html'), output, 'utf8');
fs.writeFileSync(path.join(__dirname, 'index.html'), output, 'utf8');

console.log('Successfully generated workbench.html and index.html');
