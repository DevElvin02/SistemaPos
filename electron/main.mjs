import { app, BrowserWindow, dialog, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDev = !app.isPackaged
const LOCAL_API_URL = 'http://localhost:4000/api/health'

async function isLocalApiAvailable() {
  try {
    const response = await fetch(LOCAL_API_URL)
    if (!response.ok) return false
    const json = await response.json().catch(() => null)
    return Boolean(json?.ok)
  } catch {
    return false
  }
}

async function startEmbeddedApi() {
  const { startApi } = await import('../server/index.js')

  if (await isLocalApiAvailable()) {
    return
  }

  try {
    await startApi()
  } catch (error) {
    const portBusy = error instanceof Error && /EADDRINUSE/i.test(error.message)
    if (portBusy && await isLocalApiAvailable()) {
      return
    }
    throw error
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Permite popups internos usados por impresión de tickets.
    if (url === 'about:blank') {
      return { action: 'allow' }
    }

    if (isDev && url.startsWith('http://localhost:5173')) {
      return { action: 'allow' }
    }

    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(async () => {
  try {
    await startEmbeddedApi()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo iniciar la API embebida.'
    dialog.showErrorBox('Error al iniciar Motorepuestos', message)
    app.quit()
    return
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
