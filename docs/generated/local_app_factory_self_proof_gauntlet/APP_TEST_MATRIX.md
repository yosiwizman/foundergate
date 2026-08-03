# Lane D — App Test Matrix (app-specific behavior, not "page loads")
| App | request_id | Behaviors proven by its selftest | Result |
| --- | --- | --- | --- |
| Score Keeper | req_f436e095 | add player, +1/+1 → 2, -1 → 1, leader, reset scores | PASS 6/6 |
| Budget Tracker (fake) | req_4dd98a1c | add income/expense, net=income-expense, reject non-numeric, remove, clear | PASS 5/5 |
| Inventory List | req_0c103ebd | add item, increment, decrement clamps at 0, remove, total units | PASS 5/5 |
| Notes Board | req_48826a22 | add note, edit note, delete note, clear, reject empty | PASS 5/5 |

Each test exercises the app's unique state transitions (not static text). Visible-browser proof additionally
performed ≥2 real user actions per app and captured before/after screenshots (Net:60, 2 units, 2 notes, score 1).
