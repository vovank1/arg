import { isFunction } from "lodash-es"
import mitt, { WildcardHandler } from "mitt"
import chrome from "webextension-polyfill"

import { Implementations, OnChange, StorageArea } from "../implementations"

type Events = Record<
  chrome.storage.AreaName,
  Record<string, chrome.storage.StorageChange>
>
const emitter = mitt<Events>()

function getChangeMap(
  oldValue?: any,
  newValue?: any,
): chrome.storage.StorageChange {
  const changeMap: chrome.storage.StorageChange = {
    oldValue,
    newValue,
  }
  return changeMap
}

class TestStore implements StorageArea {
  private store = new Map()

  constructor(private readonly area: chrome.storage.AreaName) {}

  remove(keys: string | string[]): Promise<void>
  remove(keys: string | string[], callback?: (() => void) | undefined): void
  remove(keys: unknown, callback?: unknown): void | Promise<void> {
    if (Array.isArray(keys)) {
      emitter.emit(
        this.area,
        Object.fromEntries(
          Array.from(this.store.entries())
            .filter(([key]) => {
              return keys.includes(key)
            })
            .map(([key]) => [
              key,
              getChangeMap(this.store.get(key), undefined),
            ]),
        ),
      )
      keys.forEach((key) => this.store.delete(key))
    } else {
      this.store.delete(keys)
      emitter.emit(this.area, {
        [keys as string]: getChangeMap(this.store.get(keys), undefined),
      })
    }
    if (isFunction(callback)) {
      return callback()
    }
    return Promise.resolve()
  }

  get(callback: (items: { [key: string]: any }) => void): void
  get(
    keys?: string | string[] | { [key: string]: any } | null | undefined,
  ): Promise<{ [key: string]: any }>
  get(
    keys: string | string[] | { [key: string]: any } | null,
    callback: (items: { [key: string]: any }) => void,
  ): void
  get(
    keys?: unknown,
    callback?: unknown,
  ): void | Promise<{ [key: string]: any }> {
    if (isFunction(keys)) {
      callback = keys as (items: { [key: string]: any }) => void
      keys = undefined
    }
    const returnObject = Object.fromEntries(
      Array.from(this.store.entries()).filter(([key]) => {
        return (
          (keys as null | undefined | string | string[])?.includes(key) ?? true
        )
      }),
    )
    if (isFunction(callback)) {
      return callback(returnObject)
    }
    return Promise.resolve(returnObject)
  }

  set(items: { [key: string]: any }): Promise<void>
  set(items: { [key: string]: any }, callback?: (() => void) | undefined): void
  set(items: { [key: string]: any }, callback?: unknown): void | Promise<void> {
    const entries = Object.entries(items)
    const changeMap = entries.reduce((acc, [key, value]) => {
      acc[key] = getChangeMap(this.store.get(key), value)
      return acc
    }, {} as Record<string, chrome.storage.StorageChange>)
    for (const [key, value] of entries) {
      this.store.set(key, value)
    }
    emitter.emit(this.area, changeMap)

    if (isFunction(callback)) {
      return callback()
    }
    return Promise.resolve()
  }
}

type Callback = (
  changes: {
    [key: string]: chrome.storage.StorageChange
  },
  areaName: "sync" | "local" | "managed" | "session",
) => void
const listenersSet = new Map<Callback, WildcardHandler<Events>>()
const onStorageChange: OnChange = {
  addListener(callback) {
    const handler: WildcardHandler<Events> = (type, event) => {
      callback(event, type)
    }
    listenersSet.set(callback, handler)
    emitter.on("*", handler)
  },
  removeListener(callback) {
    const handler = listenersSet.get(callback)
    if (handler) {
      emitter.off("*", handler)
    }
  },
}

export const chromeStorageMock: Implementations = {
  local: new TestStore("local"),
  sync: new TestStore("sync"),
  managed: new TestStore("managed"),
  session: new TestStore("session"),
  onChange: onStorageChange,
}