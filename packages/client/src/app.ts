import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import './utils/websocket'
import { useCache } from './stores/cache'
import { usePreferencesStore } from './stores/preferences'
import { useErrorLogStore } from './stores/errorlog'
import { useCertificateStore } from './stores/certificates'
import { App } from './components'
import { useProxyStore } from './stores/proxy'

export const app = createApp(App)
app.use(createPinia())
app.use(router)

// init stores that automagically will register web socket handlers
// should be extracted
useProxyStore()
useCache()
usePreferencesStore()
useErrorLogStore()
useCertificateStore()
