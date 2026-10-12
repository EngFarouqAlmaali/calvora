import { getBrowserStorage } from '@/services/storage'
import { createCalculatorStore } from '@/stores/calculator'
import { createHistoryStore } from '@/stores/history'
import { createSettingsStore } from '@/stores/settings'

function createWorkspace() {
  const storage = getBrowserStorage()
  const history = createHistoryStore(storage)
  const settings = createSettingsStore(storage)
  const calculator = createCalculatorStore({ history, settings })
  return { history, settings, calculator }
}

export type Workspace = ReturnType<typeof createWorkspace>

let workspace: Workspace | undefined

/** The single application workspace: history, settings and the calculator session. */
export function useWorkspace(): Workspace {
  workspace ??= createWorkspace()
  return workspace
}
