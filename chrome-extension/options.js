// ConnectNow Chrome Extension Settings
// Copyright © 2026 Hoang Thong Pham

document.addEventListener("DOMContentLoaded", () => {
  const serverUrlInput = document.getElementById("serverUrl")
  const domainDisplay = document.getElementById("domainDisplay")
  const saveButton = document.getElementById("saveSettings")
  const status = document.getElementById("status")

  // Load saved settings
  window.chrome.storage.sync.get(["serverUrl"], (result) => {
    const defaultUrl = "https://v0-connect-now-8m.vercel.app"
    const url = result.serverUrl || defaultUrl
    serverUrlInput.value = url
    updateDomainDisplay(url)
  })

  // Save settings
  saveButton.addEventListener("click", () => {
    const serverUrl = serverUrlInput.value.trim()

    if (!serverUrl.startsWith("http://") && !serverUrl.startsWith("https://")) {
      showStatus("Please enter a valid URL starting with http:// or https://", "error")
      return
    }

    window.chrome.storage.sync.set({ serverUrl }, () => {
      updateDomainDisplay(serverUrl)
      showStatus("Settings saved successfully! 🎉", "success")

      // Update popup if open
      window.chrome.runtime.sendMessage({ action: "updateBaseUrl", baseUrl: serverUrl }).catch(() => {})
    })
  })

  // Reset to default
  document.getElementById("resetButton").addEventListener("click", () => {
    const defaultUrl = "https://v0-connect-now-8m.vercel.app"
    serverUrlInput.value = defaultUrl
    window.chrome.storage.sync.set({ serverUrl: defaultUrl }, () => {
      updateDomainDisplay(defaultUrl)
      showStatus("Reset to default server", "success")
    })
  })

  function updateDomainDisplay(url) {
    try {
      const urlObj = new URL(url)
      domainDisplay.innerHTML = `
        <div class="domain-info">
          <div class="domain-label">Connected Server:</div>
          <div class="domain-value">${urlObj.hostname}</div>
          <div class="domain-path">${urlObj.pathname || "/"}</div>
        </div>
      `
    } catch {
      domainDisplay.innerHTML = '<div class="domain-error">Invalid URL</div>'
    }
  }

  function showStatus(message, type) {
    status.textContent = message
    status.className = `status ${type}`
    setTimeout(() => {
      status.textContent = ""
      status.className = "status"
    }, 3000)
  }
})
