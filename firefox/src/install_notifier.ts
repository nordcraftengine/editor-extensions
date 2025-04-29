let firefoxVersion = browser.runtime.getManifest().version
console.log('firefoxVersion', firefoxVersion)

// Notify the editor that the extension is installed
window.postMessage(
  {
    sender: 'nordcraft-extension',
    message_name: 'info',
    message: {
      installed: true,
      version: firefoxVersion,
    },
  },
  '*',
)

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
