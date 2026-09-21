#!/usr/bin/env bash
# Guards the invariants of the /cv page that a build failure would never catch.
#
# Two of these are privacy rules rather than correctness rules: the phone
# number and the personal gmail both appear in the source documents this page
# was built from, and a public indexed page is a different exposure from a
# .docx sent to a named recruiter. The rest pin the facts that the LinkedIn
# export and Curriculum.docx disagreed about, so a well-meaning edit that
# reintroduces "Senior Software Engineer" at NoRedInk fails loudly.
set -euo pipefail

DIST="${1:-dist}"
PAGE="$DIST/cv/index.html"
PASTE="content/cv/linkedin-paste.txt"
failures=0

fail() {
  echo "FAIL: $*" >&2
  failures=$((failures + 1))
}

if [ ! -f "$PAGE" ]; then
  echo "FAIL: no CV page at $PAGE - run 'npm run build' first" >&2
  exit 1
fi

# --- privacy --------------------------------------------------------------
if grep -rq '94857' "$DIST"; then
  fail "the phone number leaked into dist/"
  grep -rl '94857' "$DIST" >&2
else
  echo "OK: no phone number anywhere in dist/"
fi

if grep -q 'arthurbernardijordao@gmail' "$PAGE"; then
  fail "the personal gmail is on the CV page; use hi@arthurjordao.dev"
else
  echo "OK: CV page uses the public address"
fi

grep -q 'hi@arthurjordao.dev' "$PAGE" || fail "no contact address on the CV page"

# --- settled facts --------------------------------------------------------
for employer in NoRedInk Nubank Catho Accenture; do
  grep -q "$employer" "$PAGE" || fail "$employer missing from the CV page"
done

# "Senior Software Engineer" is Nubank's real title and NoRedInk's wrong one,
# so the assertion is on the count, not on presence.
senior_count=$(grep -o 'Senior Software Engineer' "$PAGE" | wc -l | tr -d ' ')
if [ "$senior_count" != "1" ]; then
  fail "expected 'Senior Software Engineer' exactly once (Nubank), found $senior_count"
else
  echo "OK: NoRedInk is Software Engineer, Nubank is Senior"
fi

grep -q 'UNINOVE' "$PAGE" || fail "UNINOVE missing from education"
for dropped in Udacity Filad Spring EJB; do
  if grep -q "$dropped" "$PAGE"; then
    fail "'$dropped' is on the CV page but the spec dropped it"
  fi
done

# --- print ----------------------------------------------------------------
# Astro's build.inlineStylesheets defaults to "auto", so a stylesheet this
# small lands in a <style> tag in the HTML rather than in /_astro/*.css. Look
# in both places: which one Astro picks is a bundling detail, and the page
# either carries the print rules or it does not.
found_print=0
grep -q '@media print' "$PAGE" && found_print=1
for css in $(grep -o '/_astro/[^"]*\.css' "$PAGE" | sort -u); do
  grep -q '@media print' "$DIST$css" && found_print=1
done
if [ "$found_print" = "1" ]; then
  echo "OK: print rules are on the page"
else
  fail "no @media print rules on the CV page, inline or linked"
fi

# The regression most likely to ship unnoticed: the reader last toggled dark
# mode, and that is what the print dialog captures. The override has to name
# the dark theme explicitly to outrank it, so assert it survives edits.
print_block=$(sed -n '/@media print/,/^}/p' "$PAGE")
if [ "$found_print" = "1" ]; then
  case "$print_block" in
    *'data-theme=\"dark\"'*|*"data-theme='dark'"*|*'data-theme=dark'*)
      echo "OK: print rules override the dark theme" ;;
    *) fail "print rules do not override data-theme=dark; a dark CV will print" ;;
  esac
fi

# --- LinkedIn paste file --------------------------------------------------
if [ ! -f "$PASTE" ]; then
  fail "no $PASTE - run 'npm run cv:linkedin'"
else
  # LinkedIn's own field limits. Pasting past them truncates silently.
  # Written in awk rather than `head -n -1`, which is a GNU extension that BSD
  # head on macOS rejects.
  about_len=$(awk '/^## ABOUT$/{s=1;next} /^## /{s=0} s{n+=length($0)+1} END{print n+0}' "$PASTE")
  [ "$about_len" -le 2600 ] || fail "ABOUT section is $about_len chars, LinkedIn caps at 2600"
  longest=$(awk '
    /^## EDUCATION$/{if(n>m)m=n; exit}
    /^### /{if(n>m)m=n; n=0; next}
    /^(Title|Dates|Location): /{next}
    {n+=length($0)+1}
    END{if(n>m)m=n; print m+0}' "$PASTE")
  [ "$longest" -le 2000 ] || fail "a position description is $longest chars, LinkedIn caps at 2000"
  echo "OK: paste file within LinkedIn field limits (about $about_len, longest role $longest)"
fi

if [ "$failures" -gt 0 ]; then
  echo "FAIL: $failures CV check(s) failed" >&2
  exit 1
fi
echo "OK: all CV checks passed"
