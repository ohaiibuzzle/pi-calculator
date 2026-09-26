# pi-calculator

A [Pi](https://github.com/earendil-works/pi) extension that gives the model a `calculate` tool, so it stops doing mental maths (and getting it wrong).

Backed by [mathjs](https://mathjs.org).

## What the model gets

A `calculate` tool that takes a list of expressions and evaluates them in order:

```
(1234.5 * 17) / 3 + sqrt(2)^3 = 6998.32842712474619009760337744841939615713934375075389614635
r = 4                         = 4
pi * r^2                      = 50.2654824574366918154022941324720461471547103900016931355991
72 degF to degC               = 22.2222222222222222222222222222222222222222222222222222222222 degC
1/0                           = Error: Result is Infinity (division by zero, overflow, or undefined operation)
```

- **Arithmetic**: `+ - * / ^ %` and parentheses
- **Functions**: `sqrt`, `abs`, `round`, `log`, `sin`/`cos`/`tan`, `factorial`, `gcd`, `mean`, and the rest of the mathjs library
- **Constants**: `pi`, `e`, `phi`
- **Units**: `5 km to mi`, `3 GiB to MB`, `sin(30 deg)`
- **Variables**: assignments persist across the expressions of one call
- **Precision**: up to 60 significant digits of output by default; the optional `precision` parameter asks for fewer

Each expression succeeds or fails on its own. The call only fails as a whole if every expression fails.

The extension also adds a prompt guideline telling the model to use `calculate` for any non-trivial arithmetic.

## Limitations

- Results that should be zero can show a tiny residue, e.g. `sin(pi)` ≈ `3e-64`.
- Evaluation runs on Pi's main thread, so a pathological input like `factorial(1e7)` can stall it.
