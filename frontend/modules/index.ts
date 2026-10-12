import type { CalculatorModule, ModeId } from '@/types'
import { scientificModule } from './scientific'
import { standardModule } from './standard'

export { scientificModule, standardModule }

/** Every available calculator mode, in display order. */
export const modules: readonly CalculatorModule[] = [standardModule, scientificModule]

export function getModule(id: ModeId): CalculatorModule {
  return id === 'scientific' ? scientificModule : standardModule
}
