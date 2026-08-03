# App Test Matrix — Round 2 (app-specific behavior)
| App | request_id | Behaviors proven | Result |
| --- | --- | --- | --- |
| Reading List | req_8b7de6b1 | add book, mark read/unread, remove, count read | PASS 5/5 |
| Unit Converter | req_968a030b | convert c→f=212, km→mi≈0.621, reject bad pair/non-number, history, clear | PASS 6/6 |
| Tally Counter | req_bf0e3922 | add counter, +1/+1→2, decrement clamps at 0, reset all, total | PASS 5/5 |
| Habit Tracker | req_848e0a25 | add habit, toggle today, reject empty, both done, reset day | PASS 6/6 |

All four are DIFFERENT from Round 1 (score/budget/inventory/notes). Visible-browser proof performed ≥2 real
user actions per app (e.g. Unit Converter showed "100 c → f = 212" and "1 km → mi = 0.621").
