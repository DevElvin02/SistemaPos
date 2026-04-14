import net from 'node:net'
import { spawn } from 'node:child_process'

const API_PORT = 4000
const RENDERER_PORT = 5173
const IS_WINDOWS = process.platform === 'win32'

function probePort(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket()

    const finish = (result) => {
      socket.destroy()
      resolve(result)
    }

    socket.setTimeout(1000)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
    socket.connect(port, host)
  })
}

async function isPortOpen(port) {
  for (const host of ['127.0.0.1', '::1', 'localhost']) {
    if (await probePort(port, host)) {
      return true
    }
  }

  return false
}

function runCommand(command, args) {
  if (IS_WINDOWS) {
    const commandLine = [command, ...args].join(' ')
    return spawn('cmd.exe', ['/d', '/s', '/c', commandLine], {
      stdio: 'inherit',
      shell: false,
      windowsHide: false,
    })
  }

  return spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    windowsHide: false,
  })
}

function runNpmScript(scriptName) {
  return runCommand(npmCommand, ['run', scriptName])
}

function wireChildExit(child, onExit) {
  child.on('exit', (code, signal) => {
    onExit(code ?? 0, signal ?? null)
  })
  return child
}

const npmCommand = IS_WINDOWS ? 'npm.cmd' : 'npm'

const apiRunning = await isPortOpen(API_PORT)
const rendererRunning = await isPortOpen(RENDERER_PORT)

let api = null

if (apiRunning) {
  console.log(`[dev:desktop] Reutilizando API existente en http://localhost:${API_PORT}`)
} else {
  console.log('[dev:desktop] Iniciando API local en http://localhost:4000')
  api = runNpmScript('dev:api')
}

if (rendererRunning) {
  console.log(`[dev:desktop] Reutilizando renderer existente en http://localhost:${RENDERER_PORT}`)
  const electron = runNpmScript('dev:electron')
  electron.on('exit', (code) => {
    if (api && !api.killed) {
      api.kill()
    }
    process.exit(code ?? 0)
  })
} else {
  console.log('[dev:desktop] Iniciando renderer y Electron')
  const renderer = runNpmScript('dev:renderer')
  const electron = runNpmScript('dev:electron')

  let shuttingDown = false

  const shutdown = (exitCode) => {
    if (shuttingDown) return
    shuttingDown = true

    if (!renderer.killed) {
      renderer.kill()
    }

    if (!electron.killed) {
      electron.kill()
    }

    if (api && !api.killed) {
      api.kill()
    }

    process.exit(exitCode)
  }

  wireChildExit(renderer, (code) => {
    shutdown(code)
  })

  wireChildExit(electron, (code) => {
    shutdown(code)
  })

  process.on('SIGINT', () => shutdown(0))
  process.on('SIGTERM', () => shutdown(0))
}