# CALVORA

### Computational Engineering Workspace

> A browser-based calculator built on a real expression engine: lexer, parser, AST, validator, and evaluator. It never uses `eval()`.

![Vue](https://img.shields.io/badge/Vue-3-42B883?logo=vue.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-build-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-black)

---

## Table of Contents

1. [What is CALVORA?](#what-is-calvora)
2. [Project Status](#project-status)
3. [Features](#features)
4. [How It Works](#how-it-works)
5. [Getting Started](#getting-started)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Project Structure](#project-structure)
8. [Roadmap](#roadmap)
9. [License](#license)

---

## What is CALVORA?

CALVORA is not a normal calculator. It does not evaluate text with `eval()` or `new Function()`.

Instead, every expression goes through a real pipeline:

```
Input → Lexer → Parser → AST → Validator → Evaluator → Result
```

The engine is written in plain TypeScript with **no dependency on Vue**.
The interface is a thin layer on top of it.

You type or click an expression. The engine parses it, checks it, evaluates it, and returns either a result or a clear error with a position.

Every calculation is saved in a searchable history.

---

## Project Status

> This section is the **source of truth**.
> Anything not listed under **Done** does not exist yet.

### Done

| Area | What works today |
|------|------------------|
| Standard mode | `+ − × ÷`, `^`, percent, parentheses, decimals, unary signs, implicit multiplication like `2(3+4)` |
| Scientific mode | `sin cos tan asin acos atan sinh cosh tanh`, `log ln log2`, `sqrt cbrt exp pow abs`, `floor ceil round`, `min max`, factorial `!`, constants `π e τ`, degree and radian modes |
| Expression engine | Lexer → tokens → parser → AST → validator → evaluator → result. No `eval()`. No `new Function()`. |
| Error handling | Typed error codes, 1-based positions, and the wrong part of the input highlighted in the UI |
| History | Search, recall, delete, clear, copy result, and `ans` for the previous result |
| Local storage | History and settings saved in `localStorage`, versioned and validated on load, with safe fallback |
| Keyboard | Full keyboard support. See [Keyboard Shortcuts](#keyboard-shortcuts) |
| Interface | Responsive layout, light and dark themes, accessible controls, visible focus, reduced-motion support |
| Tests | Vitest suites for lexer, parser, AST, precedence, evaluator, scientific functions, errors, floating-point, formatting, persistence, and history |

### In Progress

Nothing right now.

### Planned

None of these exist yet.

- Programmer mode (DEC, BIN, HEX, OCT)
- Unit conversion
- Statistics and charts
- Engineering modules (electrical, energy, solar)
- Step-by-step explanation
- Workspaces, favorites, session export
- Command palette
- Offline PWA support
- IndexedDB and Web Workers
- Matrix, complex numbers, equation solving, graphing

---

## Features

### Standard Calculator

- Basic math: `+ − × ÷`
- Power: `^`
- Percent: `18%`
- Parentheses and decimals
- Unary signs: `-5`, `+3`
- Implicit multiplication: `2(3+4)` means `2 × (3+4)`

### Scientific Calculator

- Trigonometry: `sin cos tan asin acos atan`
- Hyperbolic: `sinh cosh tanh`
- Logarithms: `log ln log2`
- Roots and powers: `sqrt cbrt exp pow`
- Rounding: `floor ceil round abs`
- Comparison: `min max`
- Factorial: `5!`
- Constants: `π`, `e`, `τ`
- Degree and radian modes

### Engine

- Real lexer, parser, AST, validator, evaluator
- No `eval()`, no `new Function()`
- Typed errors with positions
- Input length and nesting depth are capped
- Safe identifier lookup (blocks `constructor`, `__proto__`, etc.)

### History

- Search past calculations
- Recall into the input
- Delete single or clear all
- Copy result
- `ans` refers to the last result

### Persistence

- History and settings stored in `localStorage`
- Versioned and validated on load
- Safe fallback when storage is not available

### Interface

- Responsive layout
- Light and dark themes
- Semantic and labelled controls
- Visible focus states
- Reduced-motion support

---

## How It Works

Every expression follows the same path:

```
Input
  ↓  Lexer        characters → tokens
  ↓  Parser       tokens → abstract syntax tree
  ↓  Validator    functions, arity, and identifiers checked
  ↓  Evaluator    tree → number
  ↓  Result       value + display string, or a structured error
```

### Example

Expression:

```
(125 × 3.5) + √144 − 18%
```

Step by step:

1. `×` and `√` are normalized by the lexer.
2. The parser builds a tree that respects precedence and parentheses.
3. The validator checks every function and its argument count.
4. The evaluator walks the tree.
5. A percent on the right of `+` or `−` is relative to the left side. So `− 18%` subtracts 18% of `449.5`.

### Security

Input is treated as untrusted.

- Identifier lookups use own-property checks.
- Names like `constructor` or `__proto__` are rejected.
- Input length and nesting depth are capped.

The full syntax and the percent rule are documented in [`docs/expression-language.md`](docs/expression-language.md).

---

## Getting Started

### Requirements

- Node.js 18 or newer
- npm 9 or newer

### Install

```bash
git clone https://github.com/EngFarouqAlmaali/calvora.git
cd calvora
npm install
```

### Run in development

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Run tests

```bash
npm run test
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus the expression field from anywhere |
| `Enter` | Evaluate |
| `Esc` | Clear the expression |
| `↑` / `↓` | Step through earlier expressions |
| `Alt` + `1` | Standard mode |
| `Alt` + `2` | Scientific mode |
| `Alt` + `D` | Toggle degrees and radians |

---

## Project Structure

```
calvora/
├── public/
├── frontend/
│   ├── components/        presentation only
│   ├── composables/       glue between UI and stores
│   ├── core/              the engine (no Vue imports)
│   │   ├── lexer/
│   │   ├── ast/
│   │   ├── parser/
│   │   ├── validation/
│   │   ├── evaluator/
│   │   ├── format/
│   │   └── errors/
│   └── modules/           calculator definitions built on core
│       ├── standard/
│       └── scientific/
└── docs/
    └── expression-language.md
```

### Layers

| Layer | Responsibility |
|-------|----------------|
| `core/` | Pure TypeScript engine. No UI, no Vue. |
| `modules/` | Calculator modes built on top of `core/`. |
| `composables/` | Connect the UI to the stores. |
| `components/` | Presentation only. No business logic. |

---

## Roadmap

Planned, not started:

- [ ] Programmer mode (DEC, BIN, HEX, OCT)
- [ ] Unit conversion engine
- [ ] Statistics engine and charts
- [ ] Engineering modules (electrical, energy, solar)
- [ ] Step-by-step explanation
- [ ] Workspaces and favorites
- [ ] Command palette
- [ ] Offline PWA support
- [ ] IndexedDB persistence
- [ ] Web Worker execution
- [ ] Matrix calculations
- [ ] Complex numbers
- [ ] Equation solving
- [ ] Function graphing

---

## Author

**Eng. Farouq Al-Maali**

- GitHub: [@EngFarouqAlmaali](https://github.com/EngFarouqAlmaali)

---

## License

Proprietary. All rights reserved.

© Eng. Farouq Al-Maali

---

<p align="center">
  <strong>CALVORA</strong><br>
  Calculation as a workflow, not a row of buttons.
</p>
