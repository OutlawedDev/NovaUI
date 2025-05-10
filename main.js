// API endpoints
const proxAPI = "https://scriptblox-api-proxy.vercel.app/api/fetch"
const searchproxAPI = "https://scriptblox-api-proxy.vercel.app/api/search"

// DOM Elements
const scriptsGrid = document.getElementById("scripts-grid")
const searchInput = document.getElementById("search-input")
const filter = document.getElementById("filter-select")
const searchBtn = document.getElementById("search-button")
const prevBtn = document.getElementById("prev-button")
const nextBtn = document.getElementById("next-button")
const errorMsg = document.getElementById("error-message")
const modal = document.getElementById("script-details-modal")
const modalTitle = document.getElementById("modal-title")
const modalDetails = document.getElementById("modal-details")
const closeModal = document.getElementById("close-modal")
const fontSizeSlider = document.getElementById("font-size")
const fontSizeValue = document.getElementById("font-size-value")
const accentColorPicker = document.getElementById("accent-color")
const consoleOutput = document.getElementById("console-output")
const clearConsoleBtn = document.getElementById("clear-console-btn")

// Tab navigation
const navItems = document.querySelectorAll(".nav-item")
const tabContents = document.querySelectorAll(".tab-content")
const editorTabs = document.querySelectorAll(".editor-tab")
const executeBtn = document.getElementById("execute-button")
const executeScriptBtn = document.getElementById("execute-script-btn")
const clearBtn = document.getElementById("clear-btn")
const saveBtn = document.getElementById("save-btn")
const attachBtn = document.getElementById("attach-button")

// Script Hub variables
let currentPage = 1
let isModes = false
let Querys = ""
let Modes = ""
const S_Cache = new Map()

// CodeMirror editor
let editor

// Saved scripts storage
const savedScripts = {
  script1: "-- Your Roblox script here\nprint('Hello from NovaUI!')",
  script2:
    "-- Script 2\nlocal Players = game:GetService('Players')\nlocal LocalPlayer = Players.LocalPlayer\n\nprint('Player Name: ' .. LocalPlayer.Name)",
}
let currentScript = "script1"

// Server connection variables
const START_PORT = 6969
const END_PORT = 7069
let serverPort = null
let lastError = ""
let isAttached = false

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  initializeCodeMirror()
  initializeUI()
  loadScriptHub()
  setupEventListeners()
})

// Initialize CodeMirror
function initializeCodeMirror() {
  editor = CodeMirror.fromTextArea(document.getElementById("code-editor"), {
    mode: "lua",
    theme: "dracula",
    lineNumbers: true,
    matchBrackets: true,
    styleActiveLine: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: true,
    lineWrapping: true,
    extraKeys: {
      Tab: (cm) => {
        if (cm.somethingSelected()) {
          cm.indentSelection("add")
        } else {
          cm.replaceSelection("  ", "end", "+input")
        }
      },
    },
  })

  // Set initial content
  editor.setValue(savedScripts[currentScript])

  // Set editor size
  editor.setSize("100%", "100%")
}

// Initialize UI elements
function initializeUI() {
  // Set active tab
  document.querySelector(`.editor-tab[data-script="${currentScript}"]`).classList.add("active")

  // Set font size from slider
  updateFontSize()
}

// Load Script Hub
function loadScriptHub() {
  fetchScripts()
}

// Setup all event listeners
function setupEventListeners() {
  // Tab navigation
  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      // Prevent tab switching for attach and execute buttons
      if (item.id === "attach-button" || item.id === "execute-button") {
        return;
      }
      const tabId = item.getAttribute("data-tab")
      // Remove active class from all nav items and tab contents
      navItems.forEach((navItem) => navItem.classList.remove("active"))
      tabContents.forEach((content) => content.classList.remove("active"))
      // Add active class to clicked nav item and corresponding tab content
      item.classList.add("active")
      document.getElementById(tabId)?.classList.add("active")
      // Add animation to the tab content
      animateTabContent(tabId)
      // Refresh CodeMirror when switching to executor tab
      if (tabId === "executor") {
        editor.refresh()
      }
    })
  })

  // Editor tabs
  editorTabs.forEach((tab) => {
    if (!tab.classList.contains("add-tab")) {
      tab.addEventListener("click", (e) => {
        // Don't switch tabs if clicking on close button
        if (e.target.closest(".close-tab")) return

        // Save current script before switching
        savedScripts[currentScript] = editor.getValue()

        activateTab(tab)
      })

      // Close tab functionality
      const closeBtn = tab.querySelector(".close-tab")
      closeBtn.addEventListener("click", () => {
        const scriptId = tab.getAttribute("data-script")

        // Don't close if it's the last tab
        const tabCount = document.querySelectorAll(".editor-tab:not(.add-tab)").length
        if (tabCount <= 1) {
          showNotification("Cannot close the last tab", "warning")
          return
        }

        // Remove the tab element
        tab.remove()

        // Remove the script from storage
        delete savedScripts[scriptId]

        // If closing the active tab, switch to another tab
        if (scriptId === currentScript) {
          const firstTab = document.querySelector(".editor-tab:not(.add-tab)")
          if (firstTab) {
            activateTab(firstTab)
          }
        }

        logToConsole("Tab closed: " + scriptId)
      })
    } else {
      tab.addEventListener("click", () => {
        // Create a new script tab
        const scriptCount = Object.keys(savedScripts).length + 1
        const newScriptId = `script${scriptCount}`

        // Save current script before creating new one
        savedScripts[currentScript] = editor.getValue()

        // Create new script in storage
        savedScripts[newScriptId] =
          `-- Script ${scriptCount}\n-- NovaUI\n\nprint("Hello from Script ${scriptCount}")`

        // Create new tab element
        const newTab = document.createElement("div")
        newTab.className = "editor-tab"
        newTab.setAttribute("data-script", newScriptId)
        newTab.innerHTML = `Script ${scriptCount}<span class="close-tab"><i class="fas fa-times"></i></span>`

        // Add event listener to new tab
        newTab.addEventListener("click", (e) => {
          if (e.target.closest(".close-tab")) return
          savedScripts[currentScript] = editor.getValue()
          activateTab(newTab)
        })

        // Add close tab functionality
        const closeBtn = newTab.querySelector(".close-tab")
        closeBtn.addEventListener("click", () => {
          const tabCount = document.querySelectorAll(".editor-tab:not(.add-tab)").length
          if (tabCount <= 1) {
            showNotification("Cannot close the last tab", "warning")
            return
          }

          // Remove the tab element
          newTab.remove()

          // Remove the script from storage
          delete savedScripts[newScriptId]

          // If closing the active tab, switch to another tab
          if (newScriptId === currentScript) {
            const firstTab = document.querySelector(".editor-tab:not(.add-tab)")
            if (firstTab) {
              activateTab(firstTab)
            }
          }

          logToConsole("Tab closed: " + newScriptId)
        })

        // Insert new tab before the add tab button
        const tabsContainer = document.querySelector(".editor-tabs")
        tabsContainer.insertBefore(newTab, tab)

        // Activate the new tab
        activateTab(newTab)

        logToConsole("New script tab created: " + newScriptId)
        showNotification("New script tab created", "success")
      })
    }
  })

  // Execute buttons
  executeBtn.addEventListener("click", executeScript)
  executeScriptBtn.addEventListener("click", executeScript)

  // Clear button
  clearBtn.addEventListener("click", () => {
    editor.setValue("")
    savedScripts[currentScript] = ""
    logToConsole("Script cleared")
    showNotification("Script cleared", "info")
  })

  // Save button
  saveBtn.addEventListener("click", () => {
    savedScripts[currentScript] = editor.getValue()
    logToConsole("Script saved: " + currentScript)
    showNotification("Script saved", "success")
  })

  // Attach button
  attachBtn.addEventListener("click", attachToServer)

  // Clear console button
  clearConsoleBtn.addEventListener("click", () => {
    consoleOutput.innerHTML = ""
    logToConsole("Console cleared")
  })

  // Font size slider
  fontSizeSlider.addEventListener("input", updateFontSize)

  // Accent color picker
  accentColorPicker.addEventListener("input", updateAccentColor)

  // Script Hub event listeners
  searchBtn.addEventListener("click", () => {
    Querys = searchInput.value.trim()
    Modes = filter.value
    currentPage = 1
    isModes = !!Querys

    if (isModes) {
      searchScripts(Querys, Modes, currentPage)
    } else {
      fetchScripts(currentPage)
    }
  })

  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--
      if (isModes && Querys) {
        searchScripts(Querys, Modes, currentPage)
      } else {
        fetchScripts(currentPage)
      }
    }
  })

  nextBtn.addEventListener("click", () => {
    currentPage++
    if (isModes && Querys) {
      searchScripts(Querys, Modes, currentPage)
    } else {
      fetchScripts(currentPage)
    }
  })

  closeModal.addEventListener("click", () => {
    modal.style.display = "none"
  })

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      searchBtn.click()
    }
  })

  // Close modal when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.style.display = "none"
    }
  })
}

// Attach to server function
async function attachToServer() {
  // If already attached, try to change port
  if (isAttached) {
    logToConsole("Changing port...", "info")
    serverPort = null
    isAttached = false
    attachBtn.classList.remove("active")
    showNotification("Changed port", "info")

    // Try to attach again
    await scanForServer()
    return
  }

  logToConsole("Scanning for server...", "info")
  showNotification("Scanning for server...", "info")

  // Add animation to attach button
  attachBtn.classList.add("executing")

  try {
    await scanForServer()
  } catch (error) {
    logToConsole(`Error: ${error.message}`, "error")
    showNotification(`Error: ${error.message}`, "error")
  } finally {
    attachBtn.classList.remove("executing")
  }
}

// Scan for server on ports
async function scanForServer() {
  try {
    // Try each port in sequence
    for (let port = START_PORT; port <= END_PORT; port++) {
      const url = `http://127.0.0.1:${port}/secret`

      try {
        logToConsole(`Trying port ${port}...`, "info")
        const res = await fetch(url, {
          method: "GET",
        })

        if (res.ok) {
          const text = await res.text()
          if (text === "0xdeadbeef") {
            serverPort = port
            logToConsole(`✅ Server found on port ${port}`, "success")
            showNotification(`Server found on port ${port}`, "success")

            // Mark as attached
            isAttached = true
            attachBtn.classList.add("active")
            break
          }
        }
      } catch (e) {
        lastError = e.message
        // Silent fail, try next port
      }
    }

    if (!serverPort) {
      throw new Error(`Could not locate HTTP server on ports ${START_PORT}-${END_PORT}. Last error: ${lastError}`)
    }
  } catch (error) {
    logToConsole(`Error: ${error.message}`, "error")
    showNotification(`Error: ${error.message}`, "error")
    attachBtn.classList.remove("active")
    isAttached = false
  }
}

// Execute script function
async function executeScript() {
  // Save current script
  savedScripts[currentScript] = editor.getValue()
  const scriptContent = editor.getValue()

  // Add animation to execute button
  executeBtn.classList.add("executing")
  executeScriptBtn.classList.add("executing")

  // Show executing notification
  logToConsole("Executing script...", "info")
  showNotification("Executing script...", "info")

  try {
    // Check if attached to server
    if (!isAttached || !serverPort) {
      logToConsole("Not attached to server. Attempting to attach...", "warning")
      await scanForServer()

      if (!serverPort) {
        throw new Error("Failed to attach to server. Please try attaching manually.")
      }
    }

    // Now send the script content via POST
    const postUrl = `http://127.0.0.1:${serverPort}/execute`
    logToConsole(`Sending script to ${postUrl}`, "info")

    const response = await fetch(postUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: scriptContent,
    })

    if (response.ok) {
      const resultText = await response.text()
      logToConsole(`✅ Script submitted successfully: ${resultText}`, "success")
      showNotification("Script sent to server successfully.", "success")
    } else {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    // Parse script for any print statements to show in console
    const printStatements = scriptContent.match(/print\s*$$(["'].*?["']|[^)]*)$$/g)

    if (printStatements && printStatements.length > 0) {
      printStatements.forEach((statement) => {
        try {
          // Extract content inside print()
          const content = statement.match(/print\s*$$(["'].*?["']|[^)]*)$$/)[1]
          // Remove quotes if present
          const cleanContent = content.replace(/^["'](.*)["']$/, "$1")
          logToConsole("Output: " + cleanContent)
        } catch (e) {
          // If parsing fails, just log the statement
          logToConsole("Output: " + statement)
        }
      })
    }
  } catch (error) {
    logToConsole(`Error: ${error.message}`, "error")
    showNotification(`Error: ${error.message}`, "error")
  } finally {
    executeBtn.classList.remove("executing")
    executeScriptBtn.classList.remove("executing")
  }
}

// Update font size from slider
function updateFontSize() {
  const size = fontSizeSlider.value
  fontSizeValue.textContent = `${size}px`

  // Update CodeMirror font size
  document.querySelector(".CodeMirror").style.fontSize = `${size}px`
}

// Update accent color
function updateAccentColor() {
  const color = accentColorPicker.value
  document.documentElement.style.setProperty("--primary-color", color)

  // Calculate darker and lighter versions
  const darkerColor = adjustColor(color, -20)
  const lighterColor = adjustColor(color, 30)

  document.documentElement.style.setProperty("--primary-hover", darkerColor)
  document.documentElement.style.setProperty("--primary-dark", darkerColor)
  document.documentElement.style.setProperty("--primary-light", lighterColor)

  logToConsole("Theme color updated to: " + color)
  showNotification("Theme color updated", "success")
}

// Helper function to adjust color brightness
function adjustColor(color, amount) {
  return (
    "#" +
    color
      .replace(/^#/, "")
      .replace(/../g, (color) =>
        ("0" + Math.min(255, Math.max(0, Number.parseInt(color, 16) + amount)).toString(16)).substr(-2),
      )
  )
}

// Animate tab content
function animateTabContent(tabId) {
  const tabContent = document.getElementById(tabId)
  if (tabContent) {
    tabContent.style.animation = "none"
    setTimeout(() => {
      tabContent.style.animation = "fadeIn 0.5s ease"
    }, 10)
  }
}

// Log to console
function logToConsole(message, type = "") {
  const now = new Date()
  const time = now.toLocaleTimeString()

  const consoleItem = document.createElement("div")
  consoleItem.className = "console-line"

  consoleItem.innerHTML = `
    <span class="console-time">[${time}]</span>
    <span class="console-text ${type}">${message}</span>
  `

  consoleOutput.appendChild(consoleItem)

  // Scroll to bottom
  consoleOutput.scrollTop = consoleOutput.scrollHeight
}

// Show notification
function showNotification(message, type = "info") {
  const container = document.getElementById("notification-container")
  const notification = document.createElement("div")
  notification.className = `notification ${type}`

  let icon
  switch (type) {
    case "success":
      icon = "check-circle"
      break
    case "error":
      icon = "times-circle"
      break
    case "warning":
      icon = "exclamation-triangle"
      break
    default:
      icon = "info-circle"
  }

  notification.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span>${message}</span>
  `

  container.appendChild(notification)

  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.remove()
  }, 3000)
}

// Script Hub Functions
async function fetchScripts(page = 1) {
  if (S_Cache.has(page)) {
    displayScripts(S_Cache.get(page))
    return
  }

  try {
    errorMsg.style.display = "none"
    showLoading(true)

    const response = await fetch(`${proxAPI}?page=${page}`)
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Too many requests. Please wait a moment and try again.")
      }
      throw new Error(`API Error: ${response.status} - ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.result || !data.result.scripts.length) {
      throw new Error("No scripts found.")
    }

    S_Cache.set(page, data.result.scripts) // Cache result
    displayScripts(data.result.scripts)
    logToConsole(`Loaded ${data.result.scripts.length} scripts from page ${page}`)
  } catch (error) {
    displayError(error.message)
    logToConsole("Error: " + error.message, "error")
  } finally {
    showLoading(false)
  }
}

async function searchScripts(query, mode, page = 1) {
  try {
    errorMsg.style.display = "none"
    showLoading(true)

    const url = new URL(searchproxAPI)
    url.searchParams.append("q", query)
    if (mode) url.searchParams.append("mode", mode)
    url.searchParams.append("page", page)

    const response = await fetch(url)
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Too many requests. Please wait a moment and try again.")
      }
      throw new Error(`API Error: ${response.status} - ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.result || !data.result.scripts.length) {
      throw new Error("No search results found.")
    }

    displayScripts(data.result.scripts)
    logToConsole(`Found ${data.result.scripts.length} scripts matching "${query}"`)
  } catch (error) {
    displayError(error.message)
    logToConsole("Error: " + error.message, "error")
  } finally {
    showLoading(false)
  }
}

function displayScripts(scripts) {
  scriptsGrid.innerHTML = ""
  const maxTitleLength = 60

  scripts.forEach((script) => {
    let displayTitle = script.title
    if (displayTitle.length > maxTitleLength) {
      displayTitle = displayTitle.substring(0, maxTitleLength) + "..."
    }

    let imageSrc
    if (script.game?.imageUrl && script.game.imageUrl.startsWith("http")) {
      imageSrc = script.game.imageUrl
    } else {
      imageSrc = `https://scriptblox.com${script.game?.imageUrl || ""}`
    }

    const fallbackImage = "https://files.catbox.moe/gamwb1.jpg"

    const card = document.createElement("div")
    card.className = "card"
    card.innerHTML = `
      <img src="${imageSrc}" alt="${displayTitle}" loading="lazy"
          onerror="this.src='${fallbackImage}';">
      <div class="card-content">
          <h2 class="card-title">${displayTitle}</h2>
          <p class="card-game">Game: ${script.game?.name || "Universal"}</p>
      </div>
    `

    card.addEventListener("click", () => displayDetails(script))
    scriptsGrid.appendChild(card)
  })
}

function displayDetails(script) {
  const gameName = script.game?.name || "Universal"
  const gameImage = script.game?.imageUrl
    ? script.game.imageUrl.startsWith("http")
      ? script.game.imageUrl
      : `https://scriptblox.com${script.game.imageUrl}`
    : "https://files.catbox.moe/gamwb1.jpg"

  if (!script.script) {
    window.location.href = `https://scriptblox.com/script/${script.slug}`
    return
  }

  const maxModalTitleLength = 30
  const modalDisplayTitle =
    script.title.length > maxModalTitleLength ? script.title.substring(0, maxModalTitleLength) + "..." : script.title

  modalTitle.textContent = "Script Details"
  modalDetails.innerHTML = `
    <div class="minimal-details-card">
      <div class="details-header">
        <div class="header-image">
          <img src="${gameImage}" alt="${gameName}" onerror="this.src='https://files.catbox.moe/gamwb1.jpg';">
        </div>
        <div class="header-info">
          <h3>${modalDisplayTitle}</h3>
          <div class="details-tags">
            <span class="tag ${script.verified ? "verified" : "not-verified"}">
              <i class="fas fa-${script.verified ? "check-circle" : "times-circle"}"></i>
              ${script.verified ? "Verified" : "Not Verified"}
            </span>
            <span class="tag ${script.isPatched ? "patched" : "active"}">
              <i class="fas fa-${script.isPatched ? "ban" : "check"}"></i>
              ${script.isPatched ? "Patched" : "Active"}
            </span>
            <span class="tag ${script.scriptType === "paid" ? "paid" : ""}">
              <i class="fas fa-${script.scriptType === "paid" ? "dollar-sign" : "code"}"></i>
              ${script.scriptType.charAt(0).toUpperCase() + script.scriptType.slice(1)}
            </span>
            ${
              script.key
                ? `
              <span class="tag key">
                <i class="fas fa-key"></i>
                Requires Key
              </span>
            `
                : ""
            }
          </div>
        </div>
      </div>
      
      <div class="code-container">
        <pre>${script.script || "No script available."}</pre>
        <button class="copy-button" id="copy-script-btn">
          <i class="fas fa-copy"></i>
          Copy Script
        </button>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-top: 20px;">
        <button class="editor-btn" id="load-script-btn">
          <i class="fas fa-file-import"></i>
          Load to Editor
        </button>
        <button class="editor-btn primary" id="execute-modal-btn">
          <i class="fas fa-play"></i>
          Execute
        </button>
      </div>
    </div>
  `

  const copyButton = modalDetails.querySelector("#copy-script-btn")
  copyButton.addEventListener("click", () => {
    navigator.clipboard.writeText(script.script || "No script available.").then(() => {
      copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!'
      setTimeout(() => {
        copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy Script'
      }, 2000)
      logToConsole("Script copied to clipboard")
    })
  })

  const loadButton = modalDetails.querySelector("#load-script-btn")
  loadButton.addEventListener("click", () => {
    editor.setValue(script.script)
    savedScripts[currentScript] = script.script
    modal.style.display = "none"

    // Switch to executor tab
    document.querySelector('.nav-item[data-tab="executor"]').click()

    logToConsole(`Script "${script.title}" loaded to editor`)
    showNotification("Script loaded to editor", "success")
  })

  const executeModalBtn = modalDetails.querySelector("#execute-modal-btn")
  executeModalBtn.addEventListener("click", () => {
    editor.setValue(script.script)
    savedScripts[currentScript] = script.script
    modal.style.display = "none"

    // Switch to executor tab and execute
    document.querySelector('.nav-item[data-tab="executor"]').click()
    executeScript()

    logToConsole(`Script "${script.title}" executed directly`)
  })

  modal.style.display = "flex"
  logToConsole(`Viewing script details: ${script.title}`)
}

function displayError(message) {
  errorMsg.textContent = message
  errorMsg.style.display = "block"
  scriptsGrid.innerHTML = ""
}

function showLoading(isLoading) {
  if (isLoading) {
    scriptsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 50px;">
        <i class="fas fa-spinner fa-spin" style="font-size: 2em; color: var(--primary-color);"></i>
        <p style="margin-top: 15px;">Loading scripts...</p>
      </div>
    `
  }
}

// Helper function to activate a tab
function activateTab(tab) {
  // Always get the latest set of tabs
  document.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  currentScript = tab.getAttribute('data-script');
  editor.setValue(savedScripts[currentScript]);
}
