// The .js extension is necessary for Chrome to pickup the import correctly
import { setCookies } from '../../shared/setCookies.js'
import type { RequireFields } from '../../shared/setCookies.js'
import {
  getCookiesAndUpdateSessionRules,
  nordcraftIsParentFrame,
  updateSessionRules,
} from './helpers.js'

console.log('Nordcraft extension loaded')

const RULE_ID = 18112022

chrome.webNavigation.onBeforeNavigate.addListener(
  async (event) => {
    // remove existing rules. This is to prevents the rules from being applied to iframes outside nordcraft.com
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [RULE_ID],
    })

    const isNordcraft = await nordcraftIsParentFrame({
      parentFrameId: event.parentFrameId,
      parentDocumentId: event.parentDocumentId,
    })

    if (!isNordcraft) {
      return
    }

    await getCookiesAndUpdateSessionRules({
      url: event.url,
      RULE_ID,
    })
  },
  {
    url: [
      { hostContains: '.toddle.site' },
      { hostContains: '.nordcraft.site' },
    ],
  },
)

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  })

  const urlString = tab[0].url

  if (!urlString) {
    return
  }

  const url = new URL(urlString)

  if (
    url.host.endsWith('nordcraft.com') === false &&
    url.host.endsWith('-toddle.toddle.site') === false &&
    url.host.endsWith('-toddle.nordcraft.site') === false
  ) {
    return false
  }

  // Get the cookies for the .toddle.site domain
  const frames = await chrome.webNavigation.getAllFrames({
    tabId: activeInfo.tabId,
  })

  const frameUrl = frames
    ?.map((frame) => {
      const url = new URL(frame.url)
      if (
        url.host?.endsWith('.toddle.site') ||
        url.host?.endsWith('.nordcraft.site')
      ) {
        return frame.url
      }
    })
    .filter((v) => v)[0]

  if (!frameUrl) {
    return
  }

  await getCookiesAndUpdateSessionRules({ url: frameUrl, RULE_ID })
})

chrome.webRequest.onHeadersReceived.addListener(
  (info) => {
    // check the parent frame so we only override cookies if we are on nordcraft.com
    nordcraftIsParentFrame({
      parentFrameId: info.parentFrameId,
      parentDocumentId: info.parentDocumentId,
    }).then((isNordcraft) => {
      if (!isNordcraft) {
        return undefined
      }

      if (!info.initiator) {
        return undefined
      }

      if (info.responseHeaders) {
        const setCookieHeaders = info.responseHeaders
          .filter(
            (
              h,
            ): h is RequireFields<chrome.webRequest.HttpHeaders[0], 'value'> =>
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
            if (
              !domain?.endsWith('.toddle.site') &&
              !domain?.endsWith('.nordcraft.site')
            ) {
              return
            }
            await chrome.cookies.set(cookie)

            const parsedUrl = new URL(cookie.url)
            const domainCookies = await chrome.cookies.getAll({
              domain: domain ?? parsedUrl.host,
            })

            if (domainCookies.length > 0) {
              await updateSessionRules({ domainCookies, RULE_ID })
            }
          },
          removeCookie: async (cookie, domain) => {
            await chrome.cookies.remove(cookie)

            const parsedUrl = new URL(cookie.url)

            const domainCookies = await chrome.cookies.getAll({
              domain: domain ?? parsedUrl.host,
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
    })

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
