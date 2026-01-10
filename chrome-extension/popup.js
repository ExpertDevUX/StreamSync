const chrome = window.chrome

let baseUrl = "https://v0-connect-now-8m.vercel.app"

chrome.storage.sync.get(["serverUrl"], (result) => {
  if (result.serverUrl) {
    baseUrl = result.serverUrl
  }
  loadRecentRooms()
})

// Listen for settings changes
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateBaseUrl") {
    baseUrl = request.baseUrl
    loadRecentRooms()
    updateStatus(`✓ Server: ${new URL(baseUrl).hostname}`, "success")
  }
})

function generateRoomId() {
  const adjectives = ["quick", "happy", "bright", "smart", "cool", "fast", "neat", "wise"]
  const nouns = ["meeting", "chat", "talk", "call", "sync", "hub", "room", "space"]
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 1000)
  return `${adj}-${noun}-${num}`
}

// Start new instant meeting
document.getElementById("newMeeting").addEventListener("click", () => {
  const roomId = generateRoomId()
  const url = `${baseUrl}/room/${roomId}`

  addToRecentRooms(roomId, "Instant Meeting")
  openMeeting(url, "Creating instant meeting...")
})

// Schedule meeting
document.getElementById("scheduleMeeting").addEventListener("click", () => {
  const url = `${baseUrl}`
  chrome.tabs.create({ url }, () => {
    updateStatus("Opening scheduler...", "success")
    setTimeout(() => window.close(), 500)
  })
})

// Toggle password input
document.getElementById("hasPassword").addEventListener("change", (e) => {
  const passwordInput = document.getElementById("roomPassword")
  passwordInput.style.display = e.target.checked ? "block" : "none"
  if (!e.target.checked) {
    passwordInput.value = ""
  }
})

// Join meeting
document.getElementById("joinMeeting").addEventListener("click", () => {
  const roomCode = document.getElementById("roomCode").value.trim()
  const hasPassword = document.getElementById("hasPassword").checked
  const password = document.getElementById("roomPassword").value

  if (!roomCode) {
    updateStatus("Please enter a room code", "error")
    return
  }

  if (hasPassword && !password) {
    updateStatus("Please enter the password", "error")
    return
  }

  const url = hasPassword
    ? `${baseUrl}/room/${roomCode}?pwd=${encodeURIComponent(password)}`
    : `${baseUrl}/room/${roomCode}`

  addToRecentRooms(roomCode, roomCode)
  openMeeting(url, "Joining room...")
})

// Allow Enter key
document.getElementById("roomCode").addEventListener("keypress", (e) => {
  if (e.key === "Enter") document.getElementById("joinMeeting").click()
})

document.getElementById("roomPassword").addEventListener("keypress", (e) => {
  if (e.key === "Enter") document.getElementById("joinMeeting").click()
})

// Open settings
document.getElementById("openSettings").addEventListener("click", (e) => {
  e.preventDefault()
  chrome.runtime.openOptionsPage()
})

// Helper functions
function openMeeting(url, message) {
  chrome.tabs.create({ url }, () => {
    updateStatus(message, "success")
    setTimeout(() => window.close(), 500)
  })
}

function updateStatus(message, type = "") {
  const statusEl = document.getElementById("status")
  statusEl.textContent = message
  statusEl.className = "status"
  if (type) statusEl.classList.add(type)
}

function addToRecentRooms(roomId, roomName) {
  chrome.storage.sync.get(["recentRooms"], (result) => {
    let recentRooms = result.recentRooms || []
    recentRooms = recentRooms.filter((room) => room.id !== roomId)
    recentRooms.unshift({
      id: roomId,
      name: roomName,
      timestamp: Date.now(),
    })
    recentRooms = recentRooms.slice(0, 5)

    chrome.storage.sync.set({ recentRooms }, () => {
      loadRecentRooms()
    })
  })
}

function loadRecentRooms() {
  chrome.storage.sync.get(["recentRooms"], (result) => {
    const rooms = result.recentRooms || []
    const container = document.getElementById("recentRooms")

    if (rooms.length === 0) {
      container.innerHTML = `<div style="text-align: center; opacity: 0.6; padding: 20px; font-size: 13px;">No recent rooms</div>`
      return
    }

    container.innerHTML = rooms
      .map((room) => {
        const timeAgo = getTimeAgo(room.timestamp)
        return `<div class="room-item" data-room-id="${room.id}"><div><div class="room-name">${room.name}</div><div class="room-time">${timeAgo}</div></div><div>→</div></div>`
      })
      .join("")

    container.querySelectorAll(".room-item").forEach((item) => {
      item.addEventListener("click", () => {
        const roomId = item.getAttribute("data-room-id")
        const url = `${baseUrl}/room/${roomId}`
        openMeeting(url, "Rejoining room...")
      })
    })
  })
}

function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return "Just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Display current server info
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0] && tabs[0].url) {
    try {
      const currentUrl = new URL(tabs[0].url)
      const baseUrlObj = new URL(baseUrl)

      if (currentUrl.hostname === baseUrlObj.hostname || currentUrl.hostname.includes("localhost")) {
        updateStatus(`✓ ${baseUrlObj.hostname}`, "success")
        const roomMatch = tabs[0].url.match(/\/room\/([^/?]+)/)
        if (roomMatch) {
          document.getElementById("roomCode").value = roomMatch[1]
        }
      }
    } catch (e) {
      console.error("URL error:", e)
    }
  }
})
