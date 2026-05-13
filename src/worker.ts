type AssetBinding = {
  fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>
}

export default {
  async fetch(request: Request, env: { ASSETS: AssetBinding }) {
    return env.ASSETS.fetch(request)
  },
}
