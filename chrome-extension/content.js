console.log("[ConnectNow] Extension content script loaded")

// Inject helper functions into the page
const script = document.createElement("script")
script.textContent = `
  (function() {
    window.connectNowExtension = {
      isInstalled: true,
      version: "3.0.0",
      
      sendMessage: function(action, data) {
        window.postMessage({
          type: "CONNECTNOW_EXT_REQUEST",
          action: action,
          ...data
        }, "*");
      },
      
      copyToClipboard: function(text) {
        this.sendMessage("COPY_LINK", { text: text });
      },
      
      showNotification: function(title, message) {
        this.sendMessage("NOTIFICATION", { title: title, message: message });
      }
    };
    
    console.log("[ConnectNow] Extension helper injected - v3.0.0");
    
    // Dispatch event to notify page that extension is ready
    window.dispatchEvent(new CustomEvent("connectnow:extension:ready", {
      detail: { version: "3.0.0" }
    }));
  })();
`
document.documentElement.appendChild(script)
script.remove()

// Listen for messages from the web app
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CONNECTNOW_EXT_REQUEST") {
    console.log("[ConnectNow] Extension received request:", event.data)

    switch (event.data.action) {
      case "COPY_LINK":
        if (event.data.text) {
          navigator.clipboard.writeText(event.data.text).then(() => {
            sendResponse({ success: true, message: "Link copied to clipboard" })
          })
        }
        break

      case "NOTIFICATION":
        window.dispatchEvent(
          new CustomEvent("connectnow:notification", {
            detail: {
              type: "NOTIFICATION",
              title: event.data.title || "ConnectNow",
              message: event.data.message || "",
            },
          }),
        )
        sendResponse({ success: true })
        break

      case "USER_JOINED":
        window.dispatchEvent(
          new CustomEvent("connectnow:user:joined", {
            detail: {
              type: "USER_JOINED",
              userName: event.data.userName || "Someone",
            },
          }),
        )
        sendResponse({ success: true })
        break

      default:
        console.log("[ConnectNow] Unknown action:", event.data.action)
    }
  }
})

// Send response back to web app
function sendResponse(response) {
  window.postMessage(
    {
      type: "CONNECTNOW_EXT_RESPONSE",
      ...response,
    },
    "*",
  )
}

// Monitor for new participants joining
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) {
        // Look for video elements or participant indicators
        if (node.tagName === "VIDEO" || node.classList?.contains("participant")) {
          console.log("[ConnectNow] New participant detected")
        }
      }
    })
  })
})

// Start observing the document
if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}
