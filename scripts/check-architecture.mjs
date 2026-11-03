import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(resolve(root, 'survey/package.json'))
const ts = require('typescript')
const normalize = path => relative(root, path).replaceAll('\\', '/')
const files = []
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) walk(path)
    else if (/\.(ts|tsx|css)$/.test(path)) files.push(path)
  }
}
for (const dir of ['survey/src', 'server/src', 'supabase/functions']) walk(resolve(root, dir))
const graph = new Map()
const violations = []
const metrics = []
function resolveImport(file, specifier) {
  let base
  if (specifier.startsWith('.')) base = resolve(dirname(file), specifier)
  else if (specifier.startsWith('@/')) base = resolve(root, 'survey/src', specifier.slice(2))
  else return null
  const stem = base.replace(/\.js$/, '')
  return [base, stem + '.ts', stem + '.tsx', resolve(base, 'index.ts'), resolve(base, 'index.tsx')].find(existsSync) ?? null
}
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const edges = []
  let declarations = 0
  function visit(node) {
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node)) declarations++
    let specifier, typeOnly = false
    if (ts.isImportDeclaration(node)) {
      specifier = node.moduleSpecifier.text
      const clause = node.importClause
      typeOnly = !!clause?.isTypeOnly || !!(clause && !clause.name && clause.namedBindings && ts.isNamedImports(clause.namedBindings) && clause.namedBindings.elements.length && clause.namedBindings.elements.every(item => item.isTypeOnly))
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      specifier = node.moduleSpecifier.text
      typeOnly = node.isTypeOnly
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) {
      specifier = node.arguments[0].text
    }
    if (specifier) {
      const target = resolveImport(file, specifier)
      if (target) {
        const from = normalize(file), to = normalize(target)
        const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1
        edges.push({ target, typeOnly })
        if ((from.startsWith('server/') && to.startsWith('survey/')) || (from.startsWith('survey/') && to.startsWith('server/'))) violations.push({ from, to, line, rule: 'frontend-backend-boundary' })
        if (from.startsWith('survey/src/lib/') && /survey\/src\/(components|pages|ui)\//.test(to)) violations.push({ from, to, line, rule: 'lib-imports-ui' })
      }
    }
    ts.forEachChild(node, visit)
  }
  if (!file.endsWith('.css')) visit(source)
  graph.set(file, edges)
  metrics.push({ file: normalize(file), lines: text.trimEnd().split(/\r?\n/).length, declarations, imports: edges.length })
}
// Strongly connected components: report each runtime cycle once, excluding type-only imports.
let index = 0
const indices = new Map(), low = new Map(), stack = [], onStack = new Set(), cycles = []
function connect(file) {
  indices.set(file, index); low.set(file, index++); stack.push(file); onStack.add(file)
  for (const { target, typeOnly } of graph.get(file) ?? []) {
    if (typeOnly || !graph.has(target)) continue
    if (!indices.has(target)) { connect(target); low.set(file, Math.min(low.get(file), low.get(target))) }
    else if (onStack.has(target)) low.set(file, Math.min(low.get(file), indices.get(target)))
  }
  if (low.get(file) === indices.get(file)) {
    const component = []; let member
    do { member = stack.pop(); onStack.delete(member); component.push(normalize(member)) } while (member !== file)
    if (component.length > 1) cycles.push(component.sort())
  }
}
for (const file of graph.keys()) if (!indices.has(file)) connect(file)
const report = { files: files.length, runtimeCycles: cycles, violations,
  largestFiles: metrics.sort((a, b) => b.lines - a.lines).slice(0, 20),
  limits: 'Static local literal imports only; excludes type-only cycles. Size flags require manual responsibility review.' }
console.log(JSON.stringify(report, null, 2))
if (cycles.length || violations.length) process.exitCode = 1
