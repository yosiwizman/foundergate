# Lane C — Monorepo / Multi-Package Fixture
Synthetic monorepo (`tests/fixtures/local_product_loop/monorepo`) with packages/pkgA (passing) and
packages/pkgB (failing). The monorepo adapter runs each package's node test and reports an honest
aggregate: "Monorepo: 1/2 packages passed (pkgA PASS, pkgB FAIL)". No install, no network, no raw
logs, never SHIP. Verified live: FAIL (1/2).
