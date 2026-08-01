# No Shell Injection Report
All spawns use execFile with an explicit argv array (node <script> <args>), never a shell string. The objective is a single argv element; shell metacharacters, backticks, $(), pipes, redirects, newlines cannot execute. Verified by adversarial tests.
