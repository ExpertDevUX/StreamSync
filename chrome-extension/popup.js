const chrome = window.chrome

// Get the base URL from storage or use default
let baseUrl = "https://v0-connect-now-8m.vercel.app"

// Load saved settings
chrome.storage.sync.get(["baseUrl", "recentRooms"], (result) => {
  if (result.baseUrl) {
    baseUrl = result.baseUrl
  }
  if (result.recentRooms) {
    displayRecentRooms(result.recentRooms)
  }
})

// Generate friendly room ID
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

// Schedule meeting (opens home page with create modal)
document.getElementById("scheduleMeeting").addEventListener("click", () => {
  const url = `${baseUrl}`
  chrome.tabs.create({ url }, () => {
    updateStatus("Opening scheduler...", "success")
    setTimeout(() => window.close(), 500)
  })
})

// Toggle password input visibility
document.getElementById("hasPassword").addEventListener("change", (e) => {
  const passwordInput = document.getElementById("roomPassword")
  passwordInput.style.display = e.target.checked ? "block" : "none"
  if (!e.target.checked) {
    passwordInput.value = ""
  }
})

// Join existing meeting
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

  // Store password in session storage via URL parameter
  const url = hasPassword
    ? `${baseUrl}/room/${roomCode}?pwd=${encodeURIComponent(password)}`
    : `${baseUrl}/room/${roomCode}`

  addToRecentRooms(roomCode, roomCode)
  openMeeting(url, "Joining room...")
})

// Allow Enter key to join
document.getElementById("roomCode").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("joinMeeting").click()
  }
})

document.getElementById("roomPassword").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("joinMeeting").click()
  }
})

// Open settings
document.getElementById("openSettings").addEventListener("click", (e) => {
  e.preventDefault()
  chrome.runtime.openOptionsPage()
})

// Open meeting in new tab
function openMeeting(url, message) {
  chrome.tabs.create({ url }, () => {
    updateStatus(message, "success")
    setTimeout(() => window.close(), 500)
  })
}

// Update status message
function updateStatus(message, type = "") {
  const statusEl = document.getElementById("status")
  statusEl.textContent = message
  statusEl.className = "status"
  if (type) {
    statusEl.classList.add(type)
  }
}

// Add room to recent list
function addToRecentRooms(roomId, roomName) {
  chrome.storage.sync.get(["recentRooms"], (result) => {
    let recentRooms = result.recentRooms || []

    // Remove if already exists
    recentRooms = recentRooms.filter((room) => room.id !== roomId)

    // Add to beginning
    recentRooms.unshift({
      id: roomId,
      name: roomName,
      timestamp: Date.now(),
    })

    // Keep only last 5
    recentRooms = recentRooms.slice(0, 5)

    chrome.storage.sync.set({ recentRooms }, () => {
      displayRecentRooms(recentRooms)
    })
  })
}

// Display recent rooms
function displayRecentRooms(rooms) {
  const container = document.getElementById("recentRooms")

  if (!rooms || rooms.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; opacity: 0.6; padding: 20px; font-size: 13px;">
        No recent rooms
      </div>
    `
    return
  }

  container.innerHTML = rooms
    .map((room) => {
      const timeAgo = getTimeAgo(room.timestamp)
      return `
      <div class="room-item" data-room-id="${room.id}">
        <div>
          <div class="room-name">${room.name}</div>
          <div class="room-time">${timeAgo}</div>
        </div>
        <div>→</div>
      </div>
    `
    })
    .join("")

  // Add click handlers
  container.querySelectorAll(".room-item").forEach((item) => {
    item.addEventListener("click", () => {
      const roomId = item.getAttribute("data-room-id")
      const url = `${baseUrl}/room/${roomId}`
      openMeeting(url, "Rejoining room...")
    })
  })
}

// Get time ago string
function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) return "Just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Check if we're on a ConnectNow page
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0] && tabs[0].url) {
    const url = tabs[0].url
    if (url.includes("vercel.app") || url.includes("localhost")) {
      updateStatus("✓ ConnectNow active", "success")

      // Extract room ID if on a room page
      const roomMatch = url.match(/\/room\/([^/?]+)/)
      if (roomMatch) {
        const roomId = roomMatch[1]
        document.getElementById("roomCode").value = roomId
        updateStatus(`✓ Currently in: ${roomId}`, "success")
      }
    }
  }
})
