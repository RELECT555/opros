import { build } from 'esbuild'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'))
const dependencies = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).dependencies
const imports = Object.fromEntries(Object.keys(dependencies).map(name => [
  name, `npm:${name}@${lock.packages[`node_modules/${name}`].version}`,
]))
imports['dotenv/config'] = `${imports.dotenv}/config`
const output = new URL('../../supabase/functions/opros-api/', import.meta.url)
await build({
  entryPoints: [fileURLToPath(new URL('../src/app.ts', import.meta.url))],
  outfile: fileURLToPath(new URL('server.mjs', output)),
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  target: 'es2022',
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.OPROS_HOSTED': '"true"',
    'process.env.DATABASE_URL': '__oprosDatabaseUrl',
  },
  banner: { js: "const __oprosDatabaseUrl = Deno.env.get('SUPABASE_DB_URL');" },
})
await writeFile(new URL('deno.json', output), JSON.stringify({ imports }, null, 2) + '\n')
