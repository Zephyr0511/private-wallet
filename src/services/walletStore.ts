import type { WalletCard } from '../types'

const DB_NAME = 'private-wallet'
const STORE_NAME = 'cards'
const DB_VERSION = 1

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('无法打开本地数据库'))
  })
}

async function withStore<T>(mode: IDBTransactionMode, handler: (store: IDBObjectStore) => void): Promise<T> {
  const database = await openDatabase()

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)

    let settled = false
    const finish = (value: T) => {
      if (!settled) {
        settled = true
        resolve(value)
      }
    }
    const fail = (error?: DOMException | null) => {
      if (!settled) {
        settled = true
        reject(error ?? new Error('本地存储操作失败'))
      }
    }

    transaction.oncomplete = () => database.close()
    transaction.onerror = () => fail(transaction.error)
    transaction.onabort = () => fail(transaction.error)

    try {
      handler(store)
      ;(store.transaction as IDBTransaction).addEventListener('error', () => fail(store.transaction.error))
      ;(store.transaction as IDBTransaction).addEventListener('complete', () => {
        if (!settled) {
          finish(undefined as T)
        }
      })
    } catch (error) {
      database.close()
      reject(error)
    }
  })
}

export async function listWalletCards() {
  const database = await openDatabase()

  return new Promise<WalletCard[]>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      const cards = (request.result as WalletCard[]).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      resolve(cards)
    }
    request.onerror = () => reject(request.error ?? new Error('读取卡片失败'))
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => reject(transaction.error ?? new Error('读取卡片失败'))
  })
}

export function saveWalletCard(card: WalletCard) {
  return withStore<void>('readwrite', (store) => {
    store.put(card)
  })
}

export function deleteWalletCard(id: string) {
  return withStore<void>('readwrite', (store) => {
    store.delete(id)
  })
}
