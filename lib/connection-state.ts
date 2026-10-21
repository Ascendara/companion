type ConnectionData = {
  downloads: any[]
  friends: any[]
  userName: string
  lastFetch: {
    downloads: number
    friends: number
    userName: number
  }
}

type Subscriber = () => void

class ConnectionStateManager {
  private data: ConnectionData = {
    downloads: [],
    friends: [],
    userName: '',
    lastFetch: {
      downloads: 0,
      friends: 0,
      userName: 0,
    },
  }

  private subscribers: Set<Subscriber> = new Set()
  private pendingRequests: Map<string, Promise<any>> = new Map()
  private CACHE_DURATION = 5000

  subscribe(callback: Subscriber) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  private notify() {
    this.subscribers.forEach(callback => callback())
  }

  async fetchWithDedup<T>(
    key: 'downloads' | 'friends' | 'userName',
    fetcher: () => Promise<T>,
    forceRefresh = false
  ): Promise<T> {
    const now = Date.now()
    const lastFetch = this.data.lastFetch[key]
    
    const cacheDuration = key === 'downloads' ? 2000 : this.CACHE_DURATION
    if (!forceRefresh && now - lastFetch < cacheDuration) {
      console.log(`[ConnectionState] Using cached ${key} (${now - lastFetch}ms old)`)
      return this.data[key] as T
    }

    const pendingKey = `fetch_${key}`
    if (this.pendingRequests.has(pendingKey)) {
      console.log(`[ConnectionState] Deduplicating ${key} request`)
      return this.pendingRequests.get(pendingKey)!
    }

    const promise = fetcher()
      .then(result => {
        this.data[key] = result as any
        this.data.lastFetch[key] = Date.now()
        this.notify()
        this.pendingRequests.delete(pendingKey)
        return result
      })
      .catch(error => {
        this.pendingRequests.delete(pendingKey)
        throw error
      })

    this.pendingRequests.set(pendingKey, promise)
    return promise
  }

  getDownloads() {
    return this.data.downloads
  }

  getFriends() {
    return this.data.friends
  }

  getUserName() {
    return this.data.userName
  }

  clearCache() {
    this.data = {
      downloads: [],
      friends: [],
      userName: '',
      lastFetch: {
        downloads: 0,
        friends: 0,
        userName: 0,
      },
    }
    this.pendingRequests.clear()
    this.notify()
  }

  invalidate(key: 'downloads' | 'friends' | 'userName') {
    this.data.lastFetch[key] = 0
  }
}

export const connectionState = new ConnectionStateManager()
