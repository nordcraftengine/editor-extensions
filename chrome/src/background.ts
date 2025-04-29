// The .js extension is necessary for Chrome to pickup the import correctly
import { setCookies } from '../../shared/setCookies.js'
import type { RequireFields } from '../../shared/setCookies.js'
import { updateSessionRules } from './helpers.js'

console.log('Nordcraft extension loaded')

const RULE_ID = 18112022

chrome.webNavigation.onBeforeNavigate.addListener(
  async (event) => {
    // remove existing rules. This is to prevents the rules from being applied to iframes outside nordcraft.com
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [RULE_ID],
    })

    if (event.parentFrameId < 0) {
      return
    }
    // check the parent frame so we only override cookies if we are on nordcraft.com
    const parentFrame = await chrome.webNavigation.getFrame({
      documentId: event.parentDocumentId,
      frameId: event.parentFrameId,
    })

    if (!parentFrame) {
      return
    }

    const parentUrl = new URL(parentFrame.url)
    if (
      parentUrl.host.endsWith('toddle.dev') === false ||
      parentUrl.host.endsWith('nordcraft.com') === false
    ) {
      return
    }

    // Get the cookies for the .nordcraft.site domain
    const url = new URL(event.url)
    const domain = url.host
    const domainCookies = await chrome.cookies.getAll({
      domain,
    })
    const tab = chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    })

    const requestedUrl = url.origin

    // Don't return the value for the http cookies and include the requested url
    const cookies = domainCookies.map((c) =>
      c.httpOnly
        ? { ...c, url: requestedUrl, value: undefined }
        : { ...c, url: requestedUrl },
    )

    tab.then(([t]) => {
      if (t && t.id) {
        chrome.tabs.sendMessage(t.id, cookies)
      }
    })

    if (domainCookies.length > 0) {
      await updateSessionRules({ domainCookies, RULE_ID })
    }
  },
  {
    url: [
      { hostContains: '.toddle.site' },
      { hostContains: '.nordcraft.site' },
    ],
  },
)

chrome.webRequest.onHeadersReceived.addListener(
  (info) => {
    if (info.responseHeaders) {
      const setCookieHeaders = info.responseHeaders
        .filter(
          (h): h is RequireFields<chrome.webRequest.HttpHeaders[0], 'value'> =>
            h.name.toLowerCase() === 'set-cookie' &&
            typeof h.value === 'string',
        )
        .map((h) => h.value)
      if (setCookieHeaders.length === 0) {
        return
      }
      setCookies({
        setCookieHeaders,
        requestUrl: info.url,
        setCookie: async (cookie, domain) => {
          await chrome.cookies.set(cookie)

          const domainCookies = await chrome.cookies.getAll({
            domain,
          })

          if (domainCookies.length > 0) {
            await updateSessionRules({ domainCookies, RULE_ID })
          }
        },
        removeCookie: async (cookie, domain) => {
          await chrome.cookies.remove(cookie)

          const domainCookies = await chrome.cookies.getAll({
            domain,
          })

          if (domainCookies.length > 0) {
            await updateSessionRules({ domainCookies, RULE_ID })
          } else {
            await chrome.declarativeNetRequest.updateSessionRules({
              removeRuleIds: [RULE_ID],
            })
          }
        },
        notifyUser: async (requestedUrl) => {
          const url = new URL(info.url)
          const domainCookies = await chrome.cookies.getAll({
            domain: url.host,
          })

          // Don't return the value for the http cookies and include the requested url
          const cookies = domainCookies.map((c) =>
            c.httpOnly
              ? { ...c, url: requestedUrl, value: undefined }
              : { ...c, url: requestedUrl },
          )

          const tab = chrome.tabs.query({
            active: true,
            lastFocusedWindow: true,
          })

          tab.then(([t]) => {
            if (t && t.id) {
              chrome.tabs.sendMessage(t.id, cookies)
            }
          })
        },
      })
    }
    return undefined
  },
  {
    // In the manifest.json we have declared the host permissions to
    // *.nordcraft.site therefore, it's okay to use <all_urls> here
    urls: ['<all_urls>'],
    types: ['xmlhttprequest'],
  },
  // extraHeaders is necessary to read set-cookie headers
  ['responseHeaders', 'extraHeaders'],
)
