import { clearScreen } from '../utils/logger'
import type { Server } from 'http'
import { APP_NAME } from '../../shared/constants'
import { packageJson } from '../utils/package'
import tui from '../utils/tui'
import type { InstanceOptions } from '../utils/Options'
import { tempDir } from '../utils/temp-dir'
import { sep } from 'path'

const getAddress = (server: Server) => {
  const address = server.address()
  if (!address) return '?'
  if (typeof address === 'string') return address
  return `http://localhost:${address.port}`
}

export const displayServerInfo = ({ logger, server }: InstanceOptions) => {
  const title = `${APP_NAME} - ${packageJson.version}`
  const tmp = `file://${tempDir().split(sep).join('/')}`

  clearScreen()
  logger.info()
  logger.info(`  ${tui.title(title)}`)
  logger.info()
  logger.info(`  ${tui.tooltip(`Temp-folder: ${tui.link(tmp)}`)}`)
  logger.info(`  ${tui.tooltip(`GUI & Proxy Server: ${tui.link(getAddress(server))}`)}`)
  logger.info(`  ${tui.tooltip(`Automatic proxy configuration (PAC): ${tui.link(getAddress(server))}/pac`)}`)
  logger.info(`  ${tui.tooltip(`Use ${tui.tip('--open')} to automatically open your browser.`)}`)
  logger.info()
  logger.info(`  ${`Press 'q' to quit.`}`)

  logger.info()
}
