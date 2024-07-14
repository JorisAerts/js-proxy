import type { IncomingMessage, Server, ServerResponse } from 'http'
import * as http from 'http'
import type { OutgoingOptions } from '../proxy/utils'
import type { Logger } from '../utils/logger'
import { clearScreen, createLogger } from '../utils/logger'
import * as https from 'https'
import * as net from 'net'
import type { AddressInfo } from 'ws'
import { forwardRequest, forwardWebSocket } from '../proxy'
import { createCertForHost, getRootCert } from '../utils/cert-utils'
import { registerDataHandler } from '../local/websocket'
import { defineSocketServer, handleStatic, sendWsData } from '../local'
import { generatePAC } from '../PAC'
import { WebSocketMessageType } from '../../shared/WebSocketMessage'
import { isLocalhost } from '../utils/is-localhost'
import { ProxyRequest } from './ProxyRequest'
import { ProxyResponse } from './ProxyResponse'
import { createErrorMessage, createProxyRequest } from '../utils/ws-messages'
import { createErrorHandler, createErrorHandlerFor } from '../../client/utils/logging'
import { tempDir } from '../utils/temp-dir'
import { join } from 'path'
import { captureResponse } from '../utils/captureResponse'
import { HTTP_HEADER_CONTENT_LENGTH, HTTP_HEADER_CONTENT_TYPE } from '../../shared/constants'
import process from 'node:process'
import { newLine } from '../proxy/socket/newline'

export interface CreateProxyOptions {
  port: number
  proxySSL: boolean | undefined | string | RegExp
  map: ((options: OutgoingOptions, req: IncomingMessage, res: ServerResponse | null) => OutgoingOptions) | undefined
}

export interface CommonOptions {
  logger: Logger
}

export const DEFAULT_PORT = 8080

const defaultServerOptions = {
  IncomingMessage: ProxyRequest satisfies typeof IncomingMessage,
  ServerResponse: ProxyResponse satisfies typeof ServerResponse<ProxyRequest>,
} as http.ServerOptions<typeof ProxyRequest, typeof ServerResponse>

type InternalOptions<Options extends Partial<CreateProxyOptions>> = CreateProxyOptions & CommonOptions & Options

export interface CreateProxy {
  address: string
  url: URL
  server: Server
  logger: Logger
}

export function createProxyServer<Options extends Partial<CreateProxyOptions>>(opt = {} as Options): Promise<CreateProxy> {
  // the options object
  const options = {
    port: DEFAULT_PORT,
    proxySSL: true,
    ...opt,
    logger: createLogger(),
  } as InternalOptions<Options>

  const { logger } = options

  // make sure the system goes to sleep with a clear mind
  process.on('SIGINT', () => {
    // TODO: clear cache and such... (when the state is on the backend)
    clearScreen()
    logger.info('bye.\n')
    process.exit(process.exitCode)
  })

  // handle preference-changes
  registerDataHandler(WebSocketMessageType.Preferences, ({ data }) => Object.assign(options, data))

  // this ginormous method returns a promise,
  // that — as mentioned below — will resolve once the server is up.
  return new Promise((resolve) => {
    // one host on https Server
    const hosts = new Set<string>()
    let httpPort = options.port
    let httpsPort: number

    const generateCertificate = (host: string) => {
      if (hosts.has(host)) return
      const cert = createCertForHost(host)
      httpsServer.addContext(host, cert)
      sendWsData(WebSocketMessageType.Certificate, [join(tempDir(), 'cert', 'generated', `${host}.crt`)])
      hosts.add(host)
    }

    // HTTPS-tunnel (let Node choose the port)
    const httpsServer = https //
      .createServer({ ...getRootCert(), ...defaultServerOptions }, handleRequest as http.RequestListener<typeof ProxyRequest, typeof ServerResponse>)
      .listen(() => (httpsPort = (httpsServer.address() as AddressInfo).port))
    createErrorHandlerFor(httpsServer)

    // HTTP Server (the actual proxy)
    const httpServer = http //
      .createServer(defaultServerOptions, handleRequest as http.RequestListener<typeof ProxyRequest, typeof ServerResponse>)

    // try the next port if the suggested one is unavailable (8080... 8081... 8082...)
    const onError = (e: Error & { code?: string }) => {
      if (e.code === 'EADDRINUSE') {
        logger.info(`Port ${httpPort} is in use, trying another one...`)
        httpServer.listen(++httpPort)
      } else {
        sendWsData(WebSocketMessageType.Error, createErrorMessage(e))
        httpServer.removeListener('error', onError)
      }
    }

    httpServer.on('error', onError)

    // Once the server is up, the Promise that comes out of this parent function
    // will be resolved.
    // It will resolve with an object that contains the details of the server.
    httpServer.on('listening', () => {
      defineSocketServer({
        logger,
        server: httpServer,
        onConnect: () => sendWsData(WebSocketMessageType.Preferences, options),
      })
      const address = `http://localhost:${httpPort}`
      resolve({ logger, address, url: new URL(address), server: httpServer })
    })

    // A good time to start listening
    httpServer.listen(httpPort)

    // forward the requests to their ultimate destination, coming from both HTTP and HTTPS
    function handleRequest(req: ProxyRequest, res: ProxyResponse) {
      createErrorHandlerFor(req, res)
      sendWsData(WebSocketMessageType.ProxyRequest, createProxyRequest(req))

      // requests to the local webserver (the GUI or PAC)
      if (isLocalhost(req, httpPort) && (res = captureResponse(res))) {
        // capture the output and send it to the websocket
        const resCaptured = captureResponse(res)

        // intercept local requests
        if (req.url === '/pac') {
          const pac = generatePAC(`localhost:${httpPort}`)
          resCaptured.setHeader(HTTP_HEADER_CONTENT_LENGTH, pac.length)
          resCaptured.setHeader(HTTP_HEADER_CONTENT_TYPE, 'application/javascript')
          resCaptured.end(pac)
          return
        }

        // requests to this server (proxy UI)
        else {
          handleStatic(req, resCaptured)
        }
        return
      }

      // forward the request to the proxy
      return forwardRequest(req, res, options as CreateProxyOptions)
    }

    const getHttpsMediator = (host: string) => {
      if (options.proxySSL === true || (options.proxySSL && host.match(options.proxySSL))) {
        generateCertificate(host)
        return net.connect(httpsPort)
      }
      return net.connect(443, host)
    }

    // HTTPS calls, they will set up a tunnel using this request.
    // From then on, everything we see is encrypted.
    //
    // So we create a mediator, our own https server with spoofed SSL certificates,
    // so we can monitor the data again, before it's encrypted and decrypted at the other side.
    httpServer.on('connect', (req, socket) => {
      createErrorHandlerFor(req, socket)
      sendWsData(WebSocketMessageType.ProxyRequest, createProxyRequest(req))
      if (req.url?.match(/:443$/)) {
        const host = req.url.substring(0, req.url.length - 4)
        const mediator = getHttpsMediator(host)
        mediator.on('connect', () => {
          socket.write('HTTP/1.1 200 Connection established')
          newLine(socket)
          newLine(socket)
        })
        mediator.on('error', createErrorHandler(mediator))
        socket.pipe(mediator).pipe(socket)
      }
    })

    // WebSockets
    httpServer.on('upgrade', (req: ProxyRequest, socket: net.Socket, head: Buffer) => {
      createErrorHandlerFor(req, socket)
      sendWsData(WebSocketMessageType.ProxyRequest, createProxyRequest(req))
      // ignore local ws request (don't forward to the proxy (for now...))
      if (!isLocalhost(req, httpPort)) forwardWebSocket(req, socket, options as CreateProxyOptions, httpServer, head)
    })
  })
}
