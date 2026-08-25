import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

type ObservedIntersection = {
  callback: IntersectionObserverCallback
  observer: IntersectionObserver
  targets: Set<Element>
}

const observedIntersections = new Set<ObservedIntersection>()

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null
  readonly rootMargin: string
  readonly scrollMargin = '0px'
  readonly thresholds: readonly number[]

  private readonly observation: ObservedIntersection

  constructor(
    callback: IntersectionObserverCallback,
    options: IntersectionObserverInit = {},
  ) {
    this.rootMargin = options.rootMargin ?? '0px'
    this.thresholds = Array.isArray(options.threshold)
      ? options.threshold
      : [options.threshold ?? 0]
    this.observation = {
      callback,
      observer: this,
      targets: new Set(),
    }
    observedIntersections.add(this.observation)
  }

  observe(target: Element) {
    this.observation.targets.add(target)
  }

  unobserve(target: Element) {
    this.observation.targets.delete(target)
  }

  disconnect() {
    this.observation.targets.clear()
    observedIntersections.delete(this.observation)
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

class ResizeObserverMock implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
  configurable: true,
  writable: true,
  value: IntersectionObserverMock,
})

Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  writable: true,
  value: ResizeObserverMock,
})

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  writable: true,
  value() {},
})

afterEach(() => cleanup())

export function triggerObservedIntersections() {
  for (const { callback, observer, targets } of observedIntersections) {
    const entries = [...targets].map(
      (target) =>
        ({
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRatio: 1,
          intersectionRect: target.getBoundingClientRect(),
          isIntersecting: true,
          rootBounds: null,
          target,
          time: performance.now(),
        }) satisfies IntersectionObserverEntry,
    )

    if (entries.length > 0) {
      callback(entries, observer)
    }
  }
}
