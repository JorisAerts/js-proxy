import type { PropType } from 'vue'
import { defineComponent, ref, toRef, watch } from 'vue'
import type { UrlMatch } from 'js-proxy-shared/url-match'
import { VForm, VSheet, VTextField } from 'js-proxy-ui'

export const VUrlFilter = defineComponent({
  name: 'VUrlFilter',

  emits: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    'update:modelValue': (_: string | UrlMatch | undefined) => true,
  },

  props: {
    modelValue: { type: [Object, String] as PropType<string | UrlMatch | undefined> },
  },

  setup(props, { emit }) {
    const model = ref()
    const modelValue = toRef(props, 'modelValue')
    watch(modelValue, () => (model.value = structuredClone(modelValue.value)), { immediate: true })
    const handleSubmit = () => emit('update:modelValue', model.value)
    const handlePaste = (e: ClipboardEvent) => console.log((e.target as HTMLInputElement).value)
    return () => (
      <VSheet>
        <VForm onSubmit={handleSubmit}>
          <VTextField label={'Protocol'} onPaste={handlePaste}></VTextField>
          <VTextField label={'Host'} onPaste={handlePaste}></VTextField>
          <VTextField label={'Port'} onPaste={handlePaste}></VTextField>
          <VTextField label={'Path'} onPaste={handlePaste}></VTextField>
          <VTextField label={'Query'} onPaste={handlePaste}></VTextField>
        </VForm>
      </VSheet>
    )
  },
})
