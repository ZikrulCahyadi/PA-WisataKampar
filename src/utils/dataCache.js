// In-memory cache store untuk navigasi instan (0ms delay) antar halaman
const memoryCache = new Map()

export const dataCache = {
  get: (key) => {
    return memoryCache.get(key) || null
  },
  set: (key, data) => {
    memoryCache.set(key, data)
  },
  invalidate: (key) => {
    if (key) {
      memoryCache.delete(key)
    } else {
      memoryCache.clear()
    }
  },
  has: (key) => {
    return memoryCache.has(key)
  }
}
