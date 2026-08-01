import { createCounter } from './counter.mjs';

let pass = 0;
let total = 0;

function assertEqual(actual, expected, label) {
  total += 1;
  if (actual === expected) {
    pass += 1;
  } else {
    console.error(`FAILED ${label}: expected ${expected}, got ${actual}`);
  }
}

// Basic increment/decrement/reset, no clamping.
{
  const c = createCounter(5);
  assertEqual(c.value(), 5, 'basic: initial value');
  assertEqual(c.increment(), 6, 'basic: increment');
  assertEqual(c.increment(), 7, 'basic: increment again');
  assertEqual(c.decrement(), 6, 'basic: decrement');
  assertEqual(c.reset(), 5, 'basic: reset');
  assertEqual(c.value(), 5, 'basic: value after reset');
}

// Default start (no args).
{
  const c = createCounter();
  assertEqual(c.value(), 0, 'default: initial value');
  assertEqual(c.increment(), 1, 'default: increment');
  assertEqual(c.reset(), 0, 'default: reset');
}

// Clamping: increment past max stays at max.
{
  const c = createCounter(0, { min: 0, max: 2 });
  assertEqual(c.increment(), 1, 'clamp-max: increment 1');
  assertEqual(c.increment(), 2, 'clamp-max: increment 2 (at max)');
  assertEqual(c.increment(), 2, 'clamp-max: increment past max stays at max');
  assertEqual(c.increment(), 2, 'clamp-max: increment past max stays at max again');
}

// Clamping: decrement past min stays at min.
{
  const c = createCounter(0, { min: -1, max: 5 });
  assertEqual(c.decrement(), -1, 'clamp-min: decrement 1 (at min)');
  assertEqual(c.decrement(), -1, 'clamp-min: decrement past min stays at min');
  assertEqual(c.decrement(), -1, 'clamp-min: decrement past min stays at min again');
}

// Clamping: reset returns to start (within bounds).
{
  const c = createCounter(3, { min: 0, max: 10 });
  c.increment();
  c.increment();
  assertEqual(c.value(), 5, 'clamp-reset: value before reset');
  assertEqual(c.reset(), 3, 'clamp-reset: reset returns to start');
  assertEqual(c.value(), 3, 'clamp-reset: value after reset');
}

// Clamping: start value itself is clamped if outside range.
{
  const c = createCounter(100, { min: 0, max: 10 });
  assertEqual(c.value(), 10, 'clamp-start: start above max is clamped');
  assertEqual(c.reset(), 10, 'clamp-start: reset returns to clamped origin');
}

// Non-finite inputs are ignored gracefully.
{
  const c = createCounter(NaN, { min: NaN, max: undefined });
  assertEqual(c.value(), 0, 'non-finite: falls back to 0 start, no clamping');
  assertEqual(c.increment(), 1, 'non-finite: increment works without clamping');
  assertEqual(c.decrement(), 0, 'non-finite: decrement works without clamping');
}

console.log(`${pass === total ? 'PASSED' : 'FAILED'} ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
