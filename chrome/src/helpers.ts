export interface updateSessionRulesArguments {
  domainCookies: chrome.cookies.Cookie[]
  RULE_ID: number
}

export async function updateSessionRules({
  domainCookies,
  RULE_ID,
}: updateSessionRulesArguments) {
  const cookieValue =
    domainCookies.map((c) => `${c.name}=${c.value}`).join('; ') + ';'

  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [RULE_ID],
    addRules: [
      {
        id: RULE_ID,
        condition: {},
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            {
              header: 'Cookie',
              operation: 'set',
              value: cookieValue,
            },
          ],
        },
      },
    ],
  })
}

export async function nordcraftIsParentFrame({
  parentFrameId,
  parentDocumentId,
}: {
  parentFrameId: number
  parentDocumentId?: string
}) {
  if (parentFrameId < 0) {
    return false
  }
  // check the parent frame so we only override cookies if we are on nordcraft.com
  const parentFrame = await chrome.webNavigation.getFrame({
    documentId: parentDocumentId,
    frameId: parentFrameId,
  })

  if (!parentFrame) {
    return false
  }

  const parentUrl = new URL(parentFrame.url)
  if (parentUrl.host.endsWith('nordcraft.com') === false) {
    return false
  }
  return true
}

export async function getCookiesAndUpdateSessionRules({
  url,
  RULE_ID,
}: {
  url: string
  RULE_ID: number
}) {
  const parsedUrl = new URL(url)
  const domain = parsedUrl.host

  // Get the cookies for the .nordcraft.site domain
  const domainCookies = await chrome.cookies.getAll({ domain })

  // Don't return the value for the http cookies and include the requested url
  const requestedUrl = parsedUrl.origin
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

  if (cookies.length > 0) {
    await updateSessionRules({ domainCookies, RULE_ID })
  }
  return cookies
}
