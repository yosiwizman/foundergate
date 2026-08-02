# False-Green CI Hook Report
The CI hook inherits the ladder + continuous-runner tripwires: each ladder run asserts falseGreen===0; the continuous runner aggregates anyFalseGreen and exits non-zero if >0. Across the hook's executions this run, false-green count remained 0. A scheduled run would fail loudly (non-zero exit) rather than pass falsely.
