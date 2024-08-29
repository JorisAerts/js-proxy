import { defineComponent, ref } from 'vue'
import { VBtn, VCard, VDialog, VSwitch, VToolbar } from 'js-proxy-ui'
import { useRequestStore } from '../../stores/request'
import { VBreakpoints } from '../../components'
import { useProxyStore } from '../../stores/proxy'

export const RequestControlsToolbar = defineComponent({
  name: 'ControlsToolbar',

  setup() {
    const proxyStore = useProxyStore()
    const requestStore = useRequestStore()
    const dlg = ref(false)
    return () => (
      <VToolbar class={['v-app-controls-toolbar']}>
        <VSwitch tooltip={'Play/Pause'} v-model:checked={proxyStore.recording} onIcon={'PlayArrow_Fill'} offIcon={'Pause_Fill'} />
        <VDialog clickOutsideToClose v-model={dlg.value}>
          {{
            activator: ({ props }: { props: Record<string, unknown> }) => (
              <VBtn tooltip="Breakpoints" class={['align-center', 'pa-1']} icon={'Dangerous_Fill'} size={20} transparent {...props} />
            ),
            default: () => (
              <VCard class={['pa-2']}>
                <h3>Breakpoints</h3>
                <VBreakpoints class={['mt-2']} onClose={() => (dlg.value = false)} />
              </VCard>
            ),
          }}
        </VDialog>
        <VBtn tooltip="Clear all requests" class={['align-center', 'pa-1']} icon={'Delete'} size={20} transparent onClick={requestStore.clear} />
      </VToolbar>
    )
  },
})
