import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      srcDir: 'src',
      filename: 'sw.ts',
      strategies: 'injectManifest',
      manifest: {
        id: '/private-wallet',
        name: '个人钱包',
        short_name: '个人钱包',
        description: '一个适合装到 iPhone 主屏幕的私人卡包，用来保存二维码、证件照片和常用文字。',
        theme_color: '#f5f5f7',
        background_color: '#f5f5f7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [{ src: '/app-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
})
