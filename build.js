const fs = require('fs');
const path = require('path');

const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const topology = fs.readFileSync(path.join(__dirname, 'topology.json'), 'utf8');
const genesis = fs.readFileSync(path.join(__dirname, 'genesis_story.json'), 'utf8');

const dotnet = fs.readFileSync(path.join(__dirname, 'fixtures', 'dotnet_oracle.json'), 'utf8');
const java = fs.readFileSync(path.join(__dirname, 'fixtures', 'java_postgres.json'), 'utf8');
const python = fs.readFileSync(path.join(__dirname, 'fixtures', 'python_sqlite.json'), 'utf8');

const output = template
  .replace('__TOPOLOGY__', topology)
  .replace('__GENESIS__', genesis)
  .replace('__DOTNET__', dotnet)
  .replace('__JAVA__', java)
  .replace('__PYTHON__', python);

fs.writeFileSync(path.join(__dirname, 'workbench.html'), output, 'utf8');
fs.writeFileSync(path.join(__dirname, 'index.html'), output, 'utf8');

console.log('Successfully generated Architectural Genesis Workbench (workbench.html & index.html)');
