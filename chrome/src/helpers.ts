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
  if (
    parentUrl.host.endsWith('toddle.dev') === false &&
    parentUrl.host.endsWith('nordcraft.com') === false
  ) {
    return false
  }
  return true
}
