# Expression language

CALVORA evaluates expressions with its own lexer, parser and evaluator. Nothing is ever passed to `eval()` or `new Function()`.

## Literals

| Form | Examples |
| --- | --- |
| Integers and decimals | `42`, `3.14`, `.5`, `5.` |
| Scientific notation | `1e3`, `1.5E-3`, `2e+2` |

An `e` only starts an exponent when digits follow it, so `2e` means `2 * e`. Numbers too large for a double (`1e999`) are rejected.

## Operators

From highest to lowest precedence:

| Operator | Meaning | Associativity |
| --- | --- | --- |
| `!` `%` (postfix) | factorial, percent | left, chainable |
| `^` | power | right: `2^3^2 = 2^(3^2) = 512` |
| unary `+` `-` | sign | right |
| `*` `/` and implicit multiplication | multiply, divide | left |
| `+` `-` | add, subtract | left |

Consequences worth knowing:

- Unary minus binds looser than `^`, so `-2^2 = -4`. Write `(-2)^2` for `4`.
- The exponent may be signed: `2^-2 = 0.25`.
- Postfix operators bind tighter than `^`: `2^3! = 2^6`.
- The Unicode forms `×`, `÷`, `−` and `√` are accepted wherever `*`, `/`, `-` and `sqrt` are. `√` applies to the value that follows it: `√144`, `√(9+16)`.

### Implicit multiplication

Juxtaposition multiplies when the right side starts with an identifier, a `(` or `√`:

```text
2(3+4)      = 14
(1+2)(3+4)  = 21
2π          = 6.28318530718
2sin(30)    = 1
```

Two adjacent numbers (`2 3`) are an error, not `23`.

### Percent

`x%` means `x / 100`, with one context rule borrowed from handheld calculators: when a percent is the right-hand side of `+` or `-`, it is a percentage **of the left-hand side**.

```text
50%         = 0.5
200*10%     = 20
200+10%     = 220      (200 plus 10% of 200)
200-10%     = 180
100+100+10% = 220      (the left side is 100+100)
200*(1+10%) = 220      (inside multiplication it is plain 10 / 100)
```

## Constants

`pi` `π` `e` `tau` `τ`. Names are case-insensitive. Constants are available in scientific mode only. Both modes also accept `ans`, the result of the most recent calculation in history.

## Functions (scientific mode)

| Group | Functions |
| --- | --- |
| Trigonometry | `sin` `cos` `tan` `asin` `acos` `atan` `atan2(y, x)` |
| Hyperbolic | `sinh` `cosh` `tanh` |
| Logarithms | `log(x)` (base 10), `log(x, base)`, `ln`, `log2`, `exp` |
| Roots and powers | `sqrt` `cbrt` `pow(base, exponent)` |
| Rounding | `abs` `floor` `ceil` `round(x)` `round(x, digits)` (half away from zero) |
| Aggregates | `min(...)` `max(...)` with one or more arguments |
| Integer | `mod(a, b)` (sign follows `a`), `fact(n)`, and postfix `n!` |

Trigonometric functions follow the angle setting. In degree mode `sin(180)` and `cos(90)` are exactly `0`, and `tan(90)` is an error rather than a huge number. In radian mode, results within rounding noise of zero at multiples of π/2 are reported as `0`.

## Errors

Every failure is a typed error with a stable code, the phase that produced it, and the character range it refers to. The interface underlines that range.

| Code | Example |
| --- | --- |
| `EMPTY_EXPRESSION` | an empty field |
| `EXPRESSION_TOO_LONG` | more than 1000 characters |
| `UNEXPECTED_CHARACTER` | `1 + $` |
| `INVALID_NUMBER` | `1.2.3`, `1e999` |
| `UNEXPECTED_TOKEN` | `1+*2`, `2 3`, `()` |
| `UNEXPECTED_END` | `1+` |
| `MISSING_CLOSING_PAREN` | `(1+2` (points at the unclosed `(`) |
| `UNMATCHED_CLOSING_PAREN` | `1+2)` |
| `NESTING_TOO_DEEP` | more than 128 nested levels |
| `UNKNOWN_FUNCTION` | `foo(1)` |
| `UNKNOWN_IDENTIFIER` | `x + 1` |
| `NOT_A_FUNCTION` | `pi(2)` |
| `FUNCTION_NEEDS_PARENS` | `sin` |
| `WRONG_ARGUMENT_COUNT` | `pow(2)` |
| `DIVISION_BY_ZERO` | `1/0`, `0^-1`, `mod(5,0)` |
| `DOMAIN_ERROR` | `sqrt(-1)`, `log(0)`, `(-8)^(1/3)`, `171!` |
| `OVERFLOW` | `10^400` |
| `INTERNAL_ERROR` | a bug; reported generically, details are never shown |

Positions in messages are 1-based; the ranges in error objects are 0-based and half-open.

## Numeric behaviour

Arithmetic uses IEEE-754 doubles. After each operation, results that are within about 1e-14 of a short decimal are snapped to it, so `0.1 + 0.2` is exactly `0.3` and `4.35 * 100` is exactly `435`. Long results such as `1/3` are left alone, so `(1/3)*3` is `1`. Integers are never altered.

Known limitation: after catastrophic cancellation (for example `9.95 - 9`) the stored value may keep a trailing error near 1e-16. The display rounds to 12 significant digits and shows `0.95`.

Display rules: whole numbers up to 2^53 − 1 are shown in full; other values use 12 significant digits with trailing zeros removed; magnitudes of 1e15 and above, or below 1e-6, use scientific notation.
