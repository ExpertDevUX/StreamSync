// Declare chrome variable
const chrome = window.chrome

// Get the base URL from storage or use default
let baseUrl = "https://v0-connect-now-8m.vercel.app"

// Load saved URL if exists
chrome.storage.sync.get(["baseUrl"], (result) => {
  if (result.baseUrl) {
    baseUrl = result.baseUrl
  }
})

// Generate random room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 15)
}

// Start new meeting
document.getElementById("newMeeting").addEventListener("click", () => {
  const roomId = generateRoomId()
  const url = `${baseUrl}/room/${roomId}`

  chrome.tabs.create({ url }, () => {
    updateStatus("Opening new meeting...")
    setTimeout(() => window.close(), 500)
  })
})

// Join existing meeting
document.getElementById("joinMeeting").addEventListener("click", () => {
  const roomCode = document.getElementById("roomCode").value.trim()

  if (!roomCode) {
    updateStatus("Please enter a room code")
    return
  }

  const url = `${baseUrl}/room/${roomCode}`

  chrome.tabs.create({ url }, () => {
    updateStatus("Joining meeting...")
    setTimeout(() => window.close(), 500)
  })
})

// Allow Enter key to join
document.getElementById("roomCode").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("joinMeeting").click()
  }
})

// Update status message
function updateStatus(message) {
  document.getElementById("status").textContent = message
}

// Check if we're on a StreamSync page
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0] && tabs[0].url) {
    if (tabs[0].url.includes("vercel.app") || tabs[0].url.includes("localhost")) {
      updateStatus("✓ StreamSync active on this page")
    }
  }
})
