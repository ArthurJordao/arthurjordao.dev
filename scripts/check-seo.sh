#!/usr/bin/env bash
# Guards the SEO invariants that a search engine actually reads from dist/.
#
# The regression this exists to prevent is a real one: the Hugo site this
# replaced had no baseURL, so it emitted root-relative permalinks, and Search
# Console rejected both its sitemap <loc>s ("Invalid URL", 12 instances) and
# its BreadcrumbList item @id ("Invalid URL in field id"). Structured data and
# sitemaps require absolute URLs. Nothing in a build failure would have caught
# that, which is why it is checked here.
set -euo pipefail

DIST="${1:-dist}"
failures=0

fail() {
  echo "FAIL: $*" >&2
  failures=$((failures + 1))
}

if [ ! -d "$DIST" ]; then
  echo "FAIL: '$DIST' does not exist - run 'npm run build' first" >&2
  exit 1
fi

# --- sitemap: every <loc> must be an absolute URL -------------------------
sitemap="$DIST/sitemap-0.xml"
if [ ! -f "$sitemap" ]; then
  fail "no sitemap at $sitemap"
else
  total_locs=$(grep -o '<loc>[^<]*</loc>' "$sitemap" | wc -l | tr -d ' ')
  abs_locs=$(grep -o '<loc>https://[^<]*</loc>' "$sitemap" | wc -l | tr -d ' ')
  if [ "$total_locs" -eq 0 ]; then
    fail "sitemap has no <loc> entries"
  elif [ "$total_locs" != "$abs_locs" ]; then
    fail "sitemap has $((total_locs - abs_locs)) relative <loc> of $total_locs"
    grep -o '<loc>[^<]*</loc>' "$sitemap" | grep -v '<loc>https://' >&2 || true
  else
    echo "OK: sitemap, $total_locs/$total_locs <loc> absolute"
  fi
fi

# --- structured data: present, parseable, and absolute throughout ---------
pages_with_schema=0
while IFS= read -r page; do
  if ! grep -q 'application/ld+json' "$page"; then
    fail "no JSON-LD in $page"
    continue
  fi
  pages_with_schema=$((pages_with_schema + 1))

  if ! DIST_PAGE="$page" node --input-type=module -e '
    import { readFileSync } from "node:fs";

    const html = readFileSync(process.env.DIST_PAGE, "utf8");
    const match = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (!match) {
      console.error("could not extract JSON-LD");
      process.exit(1);
    }

    let schema;
    try {
      schema = JSON.parse(match[1]);
    } catch (error) {
      console.error(`JSON-LD does not parse: ${error.message}`);
      process.exit(1);
    }

    // Any value under a URL-bearing key must be absolute. This is the exact
    // check Search Console applies to itemListElement.item.@id.
    const urlKeys = new Set(["@id", "url", "image", "sameAs"]);
    const relative = [];
    const walk = (node, key) => {
      if (typeof node === "string") {
        if (urlKeys.has(key) && !/^https?:\/\//.test(node)) relative.push(`${key}=${node}`);
        return;
      }
      if (Array.isArray(node)) {
        for (const item of node) walk(item, key);
        return;
      }
      if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node)) walk(v, k);
      }
    };
    walk(schema, null);

    if (relative.length > 0) {
      console.error(`relative URLs in structured data: ${relative.join(", ")}`);
      process.exit(1);
    }

    const graph = schema["@graph"] ?? [schema];
    if (!graph.some((n) => n["@type"] === "Person")) {
      console.error("no Person node in structured data");
      process.exit(1);
    }
  '; then
    fail "structured data invalid in $page"
  fi
done < <(find "$DIST" -name index.html)

[ "$failures" -eq 0 ] && echo "OK: structured data on $pages_with_schema pages, all URLs absolute"

# --- home <title> must lead with the name, not "Home" ---------------------
home_title=$(sed -n 's/.*<title>\([^<]*\)<\/title>.*/\1/p' "$DIST/index.html")
case "$home_title" in
  "Arthur Jordão"*) echo "OK: home <title> is \"$home_title\"" ;;
  *) fail "home <title> should lead with the name, got \"$home_title\"" ;;
esac

if [ "$failures" -gt 0 ]; then
  echo "FAIL: $failures SEO check(s) failed" >&2
  exit 1
fi
echo "OK: all SEO checks passed"
