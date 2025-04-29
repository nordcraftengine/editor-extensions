let installedChromeVersion = chrome.runtime.getManifest().version

window.postMessage(
  {
    sender: 'nordcraft-extension',
    message_name: 'info',
    message: {
      installed: true,
      version: installedChromeVersion,
    },
  },
  '*',
)

document.onreadystatechange = (event) => {
  if (document.readyState === 'complete') {
    window.postMessage(
      {
        sender: 'nordcraft-extension',
        message_name: 'info',
        message: {
          installed: true,
          version: installedChromeVersion,
        },
        state: document.readyState,
      },
      '*',
    )
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  window.postMessage(
    {
      sender: 'nordcraft-extension',
      message_name: 'cookies',
      message,
    },
    '*',
  )
  sendResponse()
  return true
})
