# MOCK_ONLY fixture

This `.foundergate/` folder is a **MOCK_ONLY fixture project** for proving the FounderGate V8-A1 Truth Dashboard.
It contains **no real project data**, no secrets, and no live surface. Every file here is marked `"mock": true`
and classified `MOCK_ONLY`. It exists so the schema validator, reader, cannot-invent-state guard, and dashboard
can be proven against a genuine-shaped `.foundergate/` layout without touching any real repository.
