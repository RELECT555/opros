import { Buffer } from 'node:buffer'

const { buildApp } = await import('./server.mjs')
const app = await buildApp({ hosted: true })

Deno.serve(async (request: Request) => {
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/(?:functions\/v1\/)?opros-api(?=\/|$)/, '') || '/'
  if (path === '/ws') return new Response('Not supported in hosted mode', { status: 404 })

  const chunks: Uint8Array[] = []
  let length = 0
  if (request.body) {
    const reader = request.body.getReader()
    for (;;) {
      const part = await reader.read()
      if (part.done) break
      length += part.value.byteLength
      if (length > 3 * 1024 * 1024) {
        await reader.cancel()
        return Response.json({ error: 'Payload too large' }, { status: 413 })
      }
      chunks.push(part.value)
    }
  }
  try {
    const incomingHeaders = new Headers(request.headers)
    if (!length) {
      incomingHeaders.delete('content-type')
      incomingHeaders.delete('content-length')
      incomingHeaders.delete('transfer-encoding')
    }
    const response = await app.inject({
      method: request.method,
      url: path + url.search,
      headers: Object.fromEntries(incomingHeaders),
      ...(length ? { payload: Buffer.concat(chunks) } : {}),
      remoteAddress: request.headers.get('x-real-ip') ?? 'edge-client',
    })
    const headers = new Headers()
    for (const [key, value] of Object.entries(response.headers)) {
      if (value !== undefined && !['connection', 'content-length', 'transfer-encoding'].includes(key)) {
        headers.set(key, Array.isArray(value) ? value.join(', ') : String(value))
      }
    }
    return new Response([204, 304].includes(response.statusCode) ? null : response.rawPayload, {
      status: response.statusCode,
      headers,
    })
  } catch (error) {
    console.error('Request failed', error instanceof Error ? error.message : 'unknown')
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
})
