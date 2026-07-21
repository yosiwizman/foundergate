// FounderGate PR #189 — PR-metadata canonicalizer proof (FG-LRCQ metadata binding). Proves the ONE
// canonicalizer treats GitHub trailing-newline / line-ending normalization as EQUIVALENT while turning
// every SUBSTANTIVE change RED.
import { prMetadataDigest, canonicalBody, rawDigest } from "../../../../tools/terminal0/lrcq/pr-metadata-canon.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const T = "PR #189 title";
const BODY = "# Heading\n\nLine one has trailing spaces   \n\n- bullet a\n- bullet b\n\nfinal paragraph with a [link](https://example.com/x) and cost $10 and 25 jobs and SHA f10cd681.";

// ---- POSITIVE EQUIVALENCE (line-ending form + final-newline count only) ----
ok("01 no-final-LF == one-final-LF", prMetadataDigest(T, BODY) === prMetadataDigest(T, BODY + "\n"));
ok("02 one == many final LF", prMetadataDigest(T, BODY + "\n") === prMetadataDigest(T, BODY + "\n\n\n\n"));
ok("03 CRLF == LF", prMetadataDigest(T, BODY.replace(/\n/g, "\r\n")) === prMetadataDigest(T, BODY));
ok("04 lone CR == LF", prMetadataDigest(T, BODY.replace(/\n/g, "\r")) === prMetadataDigest(T, BODY));
ok("05 stored(no trailing) == live(GitHub +1 LF)", prMetadataDigest(T, BODY) === prMetadataDigest(T, BODY + "\n"));
ok("06 empty body deterministic + stable", canonicalBody("") === "" && canonicalBody("\n\n") === "" && prMetadataDigest(T, "") === prMetadataDigest(T, "\n"));
ok("07 canonicalBody appends exactly one LF for non-empty", canonicalBody("x\n\n\n") === "x\n" && canonicalBody("x") === "x\n");

// ---- REQUIRED RED MUTATIONS (substantive changes MUST change the digest) ----
const base = prMetadataDigest(T, BODY);
ok("08 changed title char -> red", prMetadataDigest(T + "!", BODY) !== base);
ok("09 changed body char -> red", prMetadataDigest(T, BODY.replace("final paragraph", "Final paragraph")) !== base);
ok("10 inserted internal blank line -> red", prMetadataDigest(T, BODY.replace("- bullet a\n", "- bullet a\n\n")) !== base);
ok("11 removed internal blank line -> red", prMetadataDigest(T, BODY.replace("# Heading\n\n", "# Heading\n")) !== base);
ok("12 changed Markdown link target -> red", prMetadataDigest(T, BODY.replace("https://example.com/x", "https://example.com/y")) !== base);
ok("13 changed number/cost -> red", prMetadataDigest(T, BODY.replace("$10", "$20")) !== base);
ok("14 changed job count -> red", prMetadataDigest(T, BODY.replace("25 jobs", "26 jobs")) !== base);
ok("15 changed SHA -> red", prMetadataDigest(T, BODY.replace("f10cd681", "deadbeef")) !== base);
ok("16 added internal (non-final-line) space -> red", prMetadataDigest(T, BODY.replace("bullet a", "bullet  a")) !== base);
ok("17 deleted paragraph -> red", prMetadataDigest(T, BODY.replace("\n\nfinal paragraph with a [link](https://example.com/x) and cost $10 and 25 jobs and SHA f10cd681.", "")) !== base);
ok("18 reordered bullet -> red", prMetadataDigest(T, BODY.replace("- bullet a\n- bullet b", "- bullet b\n- bullet a")) !== base);
// trailing spaces on a NON-final line are preserved (substantive) -> removing them is red
ok("19 removed trailing spaces on internal line -> red", prMetadataDigest(T, BODY.replace("trailing spaces   \n", "trailing spaces\n")) !== base);
// raw digest DOES differ for the newline case (proves the guard is canonicalization, not raw equality)
ok("20 raw digest differs across final-newline (guard is canonical, not raw)", rawDigest(BODY) !== rawDigest(BODY + "\n"));

console.log("\nLRCQ PR-METADATA-CANON SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
