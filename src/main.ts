import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import './style.css'
import App from './App.vue'

registerSW({
  immediate: true,
  onRegisteredSW(swScriptUrl, registration) {
    console.info('SW registered', swScriptUrl, registration)
  },
  onRegisterError(error) {
    console.error('SW register error', error)
  },
})

createApp(App).mount('#app')
