const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { collectFiles } = require('../tools/src/parser/javascript');
const { parseProjectFiles } = require('../tools/src/parser/project-parser');
const { buildBlastRadiusIndex } = require('../tools/src/graph/graph-builder');

test('.NET parsing extracts class methods, calls, and inheritance', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codereview-dotnet-test-'));
  try {
    const sourcePath = path.join(root, 'Services', 'CalculationService.cs');
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    fs.writeFileSync(sourcePath, [
      'namespace Risk.Services;',
      'public class CalculationService : BaseService',
      '{',
      '    public Result Calculate(Request request)',
      '    {',
      '        return this.BuildResult(request);',
      '    }',
      '    private Result BuildResult(Request request) => new Result();',
      '}'
    ].join('\n'));

    const files = collectFiles(root);
    assert.deepEqual(files, [sourcePath]);
    const [parsed] = parseProjectFiles(files, root);
    const service = parsed.symbols.classes.find(symbol => symbol.name === 'CalculationService');
    assert.ok(service);
    assert.equal(service.extends, 'BaseService');
    assert.ok(service.methods.some(method => method.name === 'Calculate'));
    assert.ok(parsed.rawCalls.some(call => call.calleeName === 'BuildResult' && call.isThis));
    assert.ok(parsed.rawInstantiations.some(item => item.className === 'Result'));

    const graph = buildBlastRadiusIndex([parsed], root);
    assert.ok(graph.edges.some(edge => edge.source.endsWith('#CalculationService.Calculate') && edge.target.endsWith('#CalculationService.BuildResult')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Angular TypeScript and template bindings are analyzed without treating HTML as JavaScript', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codereview-angular-test-'));
  try {
    const componentPath = path.join(root, 'calculation.component.ts');
    const templatePath = path.join(root, 'calculation.component.html');
    fs.writeFileSync(componentPath, [
      "import { Component } from '@angular/core';",
      "@Component({ selector: 'app-calculation', templateUrl: './calculation.component.html' })",
      'export class CalculationComponent {',
      '    calculate(amount: number): number {',
      '        return this.normalize(amount);',
      '    }',
      '    private normalize(amount: number): number { return amount; }',
      '    canSubmit(): boolean { return true; }',
      '    formatAmount(amount: number): string { return `${amount}`; }',
      '}'
    ].join('\n'));
    fs.writeFileSync(templatePath, '<button (click)="calculate(amount)" [disabled]="!canSubmit()">{{ formatAmount(amount) }}</button>');

    const files = collectFiles(root);
    assert.deepEqual(files, [templatePath, componentPath]);
    const parsedFiles = parseProjectFiles(files, root);
    const component = parsedFiles.find(result => result.filePath === componentPath);
    const componentClass = component.symbols.classes.find(symbol => symbol.name === 'CalculationComponent');
    assert.ok(componentClass);
    assert.ok(componentClass.methods.some(method => method.name === 'calculate'));
    assert.ok(component.rawCalls.some(call => call.calleeName === 'normalize' && call.isThis));

    const template = parsedFiles.find(result => result.filePath === templatePath);
    assert.ok(template.rawCalls.some(call => call.calleeName === 'calculate'));
    assert.ok(template.rawCalls.some(call => call.calleeName === 'canSubmit'));
    assert.ok(template.rawCalls.some(call => call.calleeName === 'formatAmount'));

    const graph = buildBlastRadiusIndex(parsedFiles, root);
    assert.ok(graph.edges.some(edge => edge.target.endsWith('#CalculationComponent.calculate')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Angular inline templates connect template calls to component methods', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codereview-angular-inline-test-'));
  try {
    const componentPath = path.join(root, 'inline.component.ts');
    fs.writeFileSync(componentPath, [
      "@Component({ template: '<button (click)=\"save()\"></button>' })",
      'class InlineComponent {',
      '    save(): void { this.finish(); }',
      '    finish(): void {}',
      '}'
    ].join('\n'));

    const [parsed] = parseProjectFiles(collectFiles(root), root);
    assert.ok(parsed.rawCalls.some(call => call.calleeName === 'save' && call.callerSymbolId.endsWith('#InlineComponent.<template>')));
    const graph = buildBlastRadiusIndex([parsed], root);
    assert.ok(graph.edges.some(edge => edge.target.endsWith('#InlineComponent.save')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});