const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

const normalizeOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

const getSiblingOrigins = (origin: string): string[] => {
  const url = new URL(origin)
  const host = url.hostname.toLowerCase()

  if (LOCAL_HOSTS.has(host)) return [url.origin]
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return [url.origin]

  const origins = new Set<string>([url.origin])

  if (host.startsWith('www.')) {
    url.hostname = host.slice(4)
    origins.add(url.origin)
  } else {
    url.hostname = `www.${host}`
    origins.add(url.origin)
  }

  return Array.from(origins)
}

export const getAllowedBrowserOrigins = (...rawValues: Array<string | undefined>): string[] => {
  const origins = new Set<string>()

  for (const rawValue of rawValues) {
    if (!rawValue) continue

    for (const candidate of rawValue
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)) {
      const normalizedOrigin = normalizeOrigin(candidate)
      if (!normalizedOrigin) continue

      for (const origin of getSiblingOrigins(normalizedOrigin)) {
        origins.add(origin)
      }
    }
  }

  return Array.from(origins)
}
