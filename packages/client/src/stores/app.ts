import { defineStore } from 'pinia'
import { computed, ref, triggerRef } from 'vue'

export const STORE_NAME = 'Application'

export const useAppStore = defineStore(STORE_NAME, () => {
  // "Wrap" in the response body view
  const wrapResponseData = ref(false)
  const fetching = ref(false)

  // the size of the cache and certificates and such
  const sizes = ref()

  const refresh = (retry = 0) => {
    if (retry > 5) {
      fetching.value = false
      return
    }
    fetching.value = true
    try {
      fetch('/api/server-info')
        .then((res) => res.json())
        .then((s) => (sizes.value = s))
        .catch(() => {
          fetching.value = false
          refresh(++retry)
        })
        .then(() => (fetching.value = false))
    } catch {
      refresh(++retry)
    }
  }

  const computedSizes = computed({
    get: () => {
      if (sizes.value === undefined) refresh()
      return sizes.value
    },
    set: () => refresh(),
  })

  const clear = () => {
    sizes.value = undefined
    triggerRef(fetching)
    triggerRef(sizes)
  }

  return {
    clear,
    wrapResponseData,
    sizes: computedSizes,
  }
})
