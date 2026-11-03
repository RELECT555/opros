/** Explicit flag, dev build, loopback host, and reserved slug are all required. */
export function canUseWelcomeFixture(dev: boolean, enabled: string | undefined, hostname: string, slug: string): boolean {
  return dev && enabled === 'true' && ['localhost', '127.0.0.1', '[::1]'].includes(hostname) && slug === '__preview_crm'
}
