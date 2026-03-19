const DEFAULT_LOGIN_URL = 'http://localhost:3000/admin/login/'
const DEFAULT_TIMEOUT_MS = 15000
const MAX_REDIRECTS = 5

function toURL(input, base) {
  return new URL(input, base)
}

function isLocalAsset(url, origin) {
  return url.origin === origin && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))
}

function collectAssetUrls(html, pageUrl) {
  const assetUrls = new Set()
  const assetPattern = /<(?:script|link)\b[^>]+(?:src|href)=["']([^"']+)["'][^>]*>/gi

  for (const match of html.matchAll(assetPattern)) {
    const rawUrl = match[1]
    if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('javascript:')) {
      continue
    }

    const resolvedUrl = toURL(rawUrl, pageUrl)
    if (isLocalAsset(resolvedUrl, pageUrl.origin)) {
      assetUrls.add(resolvedUrl.toString())
    }
  }

  return Array.from(assetUrls)
}

async function fetchWithRedirects(inputUrl, timeoutMs) {
  let currentUrl = new URL(inputUrl)

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    let response
    try {
      try {
        response = await fetch(currentUrl, {
          redirect: 'manual',
          signal: controller.signal,
        })
      } catch (error) {
        throw new Error(
          `Request to ${currentUrl.toString()} failed: ${error instanceof Error ? error.message : error}`,
        )
      }
    } finally {
      clearTimeout(timeoutId)
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) {
        throw new Error(`Redirect from ${currentUrl.toString()} did not include a Location header.`)
      }

      currentUrl = toURL(location, currentUrl)
      continue
    }

    const body = await response.text()
    return { body, response, url: currentUrl }
  }

  throw new Error(`Too many redirects while requesting ${inputUrl}.`)
}

async function assertOk(url, timeoutMs) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    let response
    try {
      response = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
      })
    } catch (error) {
      throw new Error(
        `Request to ${url.toString()} failed: ${error instanceof Error ? error.message : error}`,
      )
    }
    if (!response.ok) {
      throw new Error(`${url} returned HTTP ${response.status}.`)
    }
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

async function main() {
  const loginUrl = process.argv[2] || process.env.ADMIN_SMOKE_URL || DEFAULT_LOGIN_URL
  const timeoutMs = Number.parseInt(
    process.env.ADMIN_SMOKE_TIMEOUT_MS || `${DEFAULT_TIMEOUT_MS}`,
    10,
  )

  const loginResult = await fetchWithRedirects(loginUrl, timeoutMs)
  const contentType = loginResult.response.headers.get('content-type') || ''

  if (!loginResult.response.ok) {
    throw new Error(
      `Admin login page returned HTTP ${loginResult.response.status} at ${loginResult.url.toString()}.`,
    )
  }

  if (!contentType.includes('text/html')) {
    throw new Error(
      `Admin login page returned unexpected content-type ${contentType || '<empty>'}.`,
    )
  }

  if (!/\/admin\/login\/?(?:\?|$)/.test(loginResult.url.pathname + loginResult.url.search)) {
    throw new Error(
      `Expected the admin login route, but resolved to ${loginResult.url.toString()}.`,
    )
  }

  const assetUrls = collectAssetUrls(loginResult.body, loginResult.url)
  if (assetUrls.length === 0) {
    throw new Error(`No local JS/CSS assets were discovered on ${loginResult.url.toString()}.`)
  }

  const importMapUrl = process.env.ADMIN_SMOKE_IMPORTMAP_URL
    ? new URL(process.env.ADMIN_SMOKE_IMPORTMAP_URL)
    : new URL('/api/importmap-status', loginResult.url.origin)
  const importMapResponse = await assertOk(importMapUrl, timeoutMs)
  const importMapStatus = await importMapResponse.json()
  if (!importMapStatus.anyExists) {
    throw new Error(
      `Import-map artifacts are missing at runtime according to ${importMapUrl.toString()}.`,
    )
  }

  const failedAssets = []
  for (const assetUrl of assetUrls) {
    try {
      await assertOk(assetUrl, timeoutMs)
    } catch (error) {
      failedAssets.push(error instanceof Error ? error.message : `${assetUrl} failed to load.`)
    }
  }

  if (failedAssets.length > 0) {
    throw new Error(
      [
        `Admin login page loaded, but ${failedAssets.length} referenced asset(s) failed:`,
        ...failedAssets,
      ].join('\n'),
    )
  }

  console.info(`Admin smoke passed: ${loginResult.url.toString()}`)
  console.info(`Verified ${assetUrls.length} local asset(s).`)
  console.info(`Import-map status: ${importMapUrl.toString()}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
