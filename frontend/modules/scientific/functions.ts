import { ErrorCode, MathError } from '@/core/errors'
import { divide, factorial, power } from '@/core/evaluator/numeric'
import type { AngleMode, FunctionContext, FunctionDefinition } from '@/core/evaluator'

const DEGREES_PER_RADIAN = 180 / Math.PI
const RADIANS_PER_DEGREE = Math.PI / 180

/** Largest value for which a trig result is treated as a rounding artefact. */
const TRIG_ZERO_THRESHOLD = 1e-15
/** Inputs smaller than this are genuinely tiny, not rounding noise. */
const TRIG_TINY_INPUT = 1e-9

function domainError(message: string): MathError {
  return new MathError(ErrorCode.DOMAIN_ERROR, message)
}

function unary(name: string, evaluate: (x: number, context: FunctionContext) => number): FunctionDefinition {
  return {
    name,
    minArgs: 1,
    maxArgs: 1,
    evaluate: (args, context) => evaluate(args[0] ?? Number.NaN, context),
  }
}

function binary(
  name: string,
  evaluate: (a: number, b: number, context: FunctionContext) => number,
): FunctionDefinition {
  return {
    name,
    minArgs: 2,
    maxArgs: 2,
    evaluate: (args, context) => evaluate(args[0] ?? Number.NaN, args[1] ?? Number.NaN, context),
  }
}

function toRadians(angle: number, mode: AngleMode): number {
  return mode === 'deg' ? angle * RADIANS_PER_DEGREE : angle
}

function fromRadians(angle: number, mode: AngleMode): number {
  return mode === 'deg' ? angle * DEGREES_PER_RADIAN : angle
}

/** In radian mode, `sin(π)` is ~1e-16; report the exact zero people expect. */
function snapTrig(result: number, input: number): number {
  return Math.abs(result) < TRIG_ZERO_THRESHOLD && Math.abs(input) >= TRIG_TINY_INPUT ? 0 : result
}

function requireUnitInterval(name: string, x: number): void {
  if (x < -1 || x > 1) throw domainError(`${name} is only defined for values from -1 to 1.`)
}

/** Round half away from zero, to `digits` decimal places, without binary-float drift. */
function roundTo(x: number, digits: number): number {
  if (!Number.isInteger(digits) || digits < 0 || digits > 15) {
    throw domainError('round() digits must be a whole number from 0 to 15.')
  }
  const [mantissa = '0', exponent = '0'] = Math.abs(x).toExponential().split('e')
  const shifted = Number(`${mantissa}e${Number(exponent) + digits}`)
  if (shifted >= 2 ** 52) return x // already a whole number at this scale
  const rounded = Math.round(shifted)
  return (x < 0 ? -1 : 1) * Number(`${rounded}e${-digits}`)
}

export const scientificFunctions: readonly FunctionDefinition[] = [
  // Trigonometry — angles follow the active degree/radian mode.
  unary('sin', (x, { angleMode }) => {
    if (angleMode === 'deg') return x % 180 === 0 ? 0 : Math.sin(toRadians(x, angleMode))
    return snapTrig(Math.sin(x), x)
  }),
  unary('cos', (x, { angleMode }) => {
    if (angleMode === 'deg') return (x - 90) % 180 === 0 ? 0 : Math.cos(toRadians(x, angleMode))
    return snapTrig(Math.cos(x), x)
  }),
  unary('tan', (x, { angleMode }) => {
    if (angleMode === 'deg') {
      if (x % 180 === 0) return 0
      if ((x - 90) % 180 === 0) throw domainError('tan is undefined at odd multiples of 90°.')
      return Math.tan(toRadians(x, angleMode))
    }
    if (Math.abs(Math.cos(x)) < TRIG_ZERO_THRESHOLD) {
      throw domainError('tan is undefined at odd multiples of π/2.')
    }
    return snapTrig(Math.tan(x), x)
  }),
  unary('asin', (x, { angleMode }) => {
    requireUnitInterval('asin', x)
    return fromRadians(Math.asin(x), angleMode)
  }),
  unary('acos', (x, { angleMode }) => {
    requireUnitInterval('acos', x)
    return fromRadians(Math.acos(x), angleMode)
  }),
  unary('atan', (x, { angleMode }) => fromRadians(Math.atan(x), angleMode)),
  binary('atan2', (y, x, { angleMode }) => {
    if (y === 0 && x === 0) throw domainError('atan2(0, 0) is undefined.')
    return fromRadians(Math.atan2(y, x), angleMode)
  }),

  // Hyperbolic
  unary('sinh', (x) => Math.sinh(x)),
  unary('cosh', (x) => Math.cosh(x)),
  unary('tanh', (x) => Math.tanh(x)),

  // Logarithms and exponentials
  {
    name: 'log',
    minArgs: 1,
    maxArgs: 2,
    evaluate: (args) => {
      const x = args[0] ?? Number.NaN
      if (x <= 0) throw domainError('log is only defined for positive numbers.')
      if (args.length === 1) return Math.log10(x)
      const base = args[1] ?? Number.NaN
      if (base <= 0 || base === 1) {
        throw domainError('The base of log must be positive and not equal to 1.')
      }
      return divide(Math.log(x), Math.log(base))
    },
  },
  unary('ln', (x) => {
    if (x <= 0) throw domainError('ln is only defined for positive numbers.')
    return Math.log(x)
  }),
  unary('log2', (x) => {
    if (x <= 0) throw domainError('log2 is only defined for positive numbers.')
    return Math.log2(x)
  }),
  unary('exp', (x) => Math.exp(x)),

  // Roots and powers
  unary('sqrt', (x) => {
    if (x < 0) throw domainError('The square root of a negative number is not real.')
    return Math.sqrt(x)
  }),
  unary('cbrt', (x) => Math.cbrt(x)),
  binary('pow', (base, exponent) => power(base, exponent)),

  // Rounding and magnitude
  unary('abs', (x) => Math.abs(x)),
  unary('floor', (x) => Math.floor(x)),
  unary('ceil', (x) => Math.ceil(x)),
  {
    name: 'round',
    minArgs: 1,
    maxArgs: 2,
    evaluate: (args) => roundTo(args[0] ?? Number.NaN, args[1] ?? 0),
  },

  // Aggregates and integer helpers
  {
    name: 'min',
    minArgs: 1,
    maxArgs: Number.POSITIVE_INFINITY,
    evaluate: (args) => Math.min(...args),
  },
  {
    name: 'max',
    minArgs: 1,
    maxArgs: Number.POSITIVE_INFINITY,
    evaluate: (args) => Math.max(...args),
  },
  binary('mod', (a, b) => {
    if (b === 0) throw new MathError(ErrorCode.DIVISION_BY_ZERO, 'Modulo by zero.')
    return a % b
  }),
  unary('fact', (x) => factorial(x)),
]
