/**
 * IndexedDB persistence helpers.
 *
 * Uses a single database ("dataroom-mvp") with three object stores to avoid
 * the race condition that occurs when idb-keyval's createStore() opens the same
 * database multiple times with different version requirements.
 *
 * Stores:
 *   "datarooms" → key: "list", value: Dataroom[]
 *   "nodes"     → key: "list", value: DataroomNode[]
 *   "blobs"     → key: blobKey (UUID), value: Blob
 */
import type { Dataroom, DataroomNode } from '@/types'

const DB_NAME = 'dataroom-mvp'
const DB_VERSION = 2
const STORE_DATAROOMS = 'datarooms'
const STORE_NODES = 'nodes'
const STORE_BLOBS = 'blobs'
const LIST_KEY = 'list'

// ── Database singleton ────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_DATAROOMS)) {
        db.createObjectStore(STORE_DATAROOMS)
      }
      if (!db.objectStoreNames.contains(STORE_NODES)) {
        db.createObjectStore(STORE_NODES)
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS)
      }
    }
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result
      resolve(_db)
    }
    req.onerror = () => reject(req.error)
  })
}

function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly')
        const req = tx.objectStore(store).get(key)
        req.onsuccess = () => resolve(req.result as T | undefined)
        req.onerror = () => reject(req.error)
      }),
  )
}

function idbSet(store: string, key: string, value: unknown): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite')
        const req = tx.objectStore(store).put(value, key)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      }),
  )
}

function idbDelete(store: string, key: string): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite')
        const req = tx.objectStore(store).delete(key)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      }),
  )
}

// ── Datarooms ────────────────────────────────────────────────────────────────

export async function persistDatarooms(datarooms: Dataroom[]): Promise<void> {
  await idbSet(STORE_DATAROOMS, LIST_KEY, datarooms)
}

export async function loadDatarooms(): Promise<Dataroom[]> {
  return (await idbGet<Dataroom[]>(STORE_DATAROOMS, LIST_KEY)) ?? []
}

// ── Nodes ────────────────────────────────────────────────────────────────────

export async function persistNodes(nodes: DataroomNode[]): Promise<void> {
  await idbSet(STORE_NODES, LIST_KEY, nodes)
}

export async function loadNodes(): Promise<DataroomNode[]> {
  return (await idbGet<DataroomNode[]>(STORE_NODES, LIST_KEY)) ?? []
}

// ── Blobs ────────────────────────────────────────────────────────────────────

export async function persistBlob(blobKey: string, blob: Blob): Promise<void> {
  await idbSet(STORE_BLOBS, blobKey, blob)
}

export async function loadBlob(blobKey: string): Promise<Blob | undefined> {
  return idbGet<Blob>(STORE_BLOBS, blobKey)
}

export async function deleteBlob(blobKey: string): Promise<void> {
  await idbDelete(STORE_BLOBS, blobKey)
}

export async function deleteBlobs(blobKeys: string[]): Promise<void> {
  await Promise.all(blobKeys.map(deleteBlob))
}
