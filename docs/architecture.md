# Architecture

CALVORA has three layers. Dependencies only point downwards.

```text
components/, composables/, App.vue     presentation (Vue)
stores/, services/                     application state and persistence
modules/                               calculator definitions
core/                                  the engine (no Vue, no DOM)
```

## The engine: `frontend/core/`

```text
input → lexer → tokens → parser → AST → validator → evaluator → number → formatter
```

| Folder | Responsibility |
| --- | --- |
| `lexer/` | Characters to tokens with exact source offsets. Normalises `× ÷ − √`. |
| `ast/` | Immutable, discriminated node types, plus an S-expression printer used by tests. |
| `parser/` | Recursive-descent parser. Precedence is encoded in the grammar, documented at the top of `parser/index.ts`. |
| `validation/` | Checks that identifiers and functions exist and that argument counts fit, before anything is evaluated. |
| `evaluator/` | Walks the tree. Pure numeric helpers live in `numeric.ts`. |
| `format/` | Number to display string. |
| `errors/` | Typed errors, codes, phases and spans. |
| `engine.ts` | `createEngine({ functions, constants })` runs the whole pipeline and never throws; it returns `{ ok: true, value, formatted, ast }` or `{ ok: false, error }`. |

Safety properties:

- There is no `eval`, `new Function`, dynamic `import`, or string-to-code step anywhere.
- Functions and constants are looked up in `Map`s, never in plain objects, so `constructor` or `__proto__` cannot resolve to anything inherited.
- Input length (1000) and nesting depth (128) are capped, so hostile input cannot overflow the stack.
- Unknown failures are reported as a generic `INTERNAL_ERROR`; internal messages are not exposed.
- Function implementations throw `MathError`, which the evaluator converts into an error carrying the span of the node that failed.

## Modules: `frontend/modules/`

A module is a `CalculatorModule`: an engine configured with a set of functions and constants, plus the keypad that drives it. `standard` has no functions or constants. `scientific` registers the functions in `scientific/functions.ts` and the constants in `scientific/constants.ts`. Adding a function means adding one definition to that list; the parser is not involved.

## State and persistence

- `services/storage.ts` defines a small `KeyValueStorage` interface, a memory fallback, and `getBrowserStorage()`, which proves `localStorage` is usable with a real write before relying on it.
- `services/persistence.ts` wraps data in a versioned envelope and validates every field on load. Corrupt entries are dropped, unknown versions are discarded, and the history is capped at 200 entries.
- `stores/` are plain Vue reactive factories (no state library). Each takes its storage as an argument, so tests run them without a browser.
  - `history`: newest first, search, delete, clear, and de-duplication of an immediate repeat.
  - `settings`: mode, angle unit and theme.
  - `calculator`: the expression, its outcome, a live preview, keypad actions, and arrow-key navigation through earlier expressions.

## Presentation

Components receive data and emit events; they hold no calculation logic. Key behaviour such as inserting at the caret and deleting a whole code point is in `utils/expression.ts` as pure functions.

## Tests

Vitest, in `tests/`, run in Node with no DOM. They cover the lexer, parser and AST, precedence, unary and postfix operators, implicit multiplication, parentheses, arithmetic, scientific functions in both angle modes, division by zero, domain errors, unknown functions and identifiers, floating-point behaviour, formatting, error robustness, persistence validation, and the stores.
