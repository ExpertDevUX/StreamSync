console.log("[StreamSync] Extension active")

// Listen for messages from the web app
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "STREAMSYNC_EXT_REQUEST") {
    console.log("[StreamSync] Extension received request:", event.data)

    // Handle different request types
    switch (event.data.action) {
      case "COPY_LINK":
        if (event.data.link) {
          navigator.clipboard.writeText(event.data.link)
          sendResponse({ success: true, message: "Link copied" })
        }
        break

      case "NOTIFICATION":
        if (event.data.message) {
          console.log("[StreamSync] Notification:", event.data.message)
          sendResponse({ success: true })
        }
        break

      default:
        console.log("[StreamSync] Unknown action:", event.data.action)
    }
  }
})

// Send response back to web app
function sendResponse(response) {
  window.postMessage(
    {
      type: "STREAMSYNC_EXT_RESPONSE",
      ...response,
    },
    "*",
  )
}

// Inject helper functions into the page
const script = document.createElement("script")
script.textContent = `
  window.streamSyncExtension = {
    isInstalled: true,
    sendMessage: function(action, data) {
      window.postMessage({
        type: "STREAMSYNC_EXT_REQUEST",
        action: action,
        ...data
      }, "*");
    }
  };
  
  console.log("[StreamSync] Extension helper injected");
`
document.documentElement.appendChild(script)
script.remove()
