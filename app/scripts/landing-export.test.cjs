// Run after: npx expo export --platform web --output-dir .expo/landing-export
/* global __dirname */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../.expo/landing-export");
const html = readFileSync(path.join(root, "index.html"), "utf8");

test("the public root exports useful content and SEO before session restoration", () => {
  assert.match(html, /<h1>Plan smarter routes\./);
  assert.match(html, /<main id="main-content">/);
  assert.match(
    html,
    /<title[^>]*>RouteFloww \| Multi-stop route planning and driver dispatch<\/title>/,
  );
  assert.match(html, /rel="canonical" href="https:\/\/routefloww\.com\/"/);
  assert.match(html, /property="og:description"/);
  assert.match(html, /<footer/);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
});

test("every public-page anchor resolves to a section or an exported route", () => {
  const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.ok(
    links.length > 10,
    "Expected navigation and conversion links in static HTML",
  );
  for (const href of links) {
    if (href.startsWith("#")) {
      assert.ok(
        html.includes(`id="${href.slice(1)}"`),
        `Missing section: ${href}`,
      );
    } else if (href.startsWith("/")) {
      const pathname = href.split("?")[0];
      const file =
        pathname === "/" ? "index.html" : `${pathname.slice(1)}.html`;
      assert.ok(existsSync(path.join(root, file)), `Missing route: ${href}`);
    } else {
      assert.equal(new URL(href).protocol, "https:");
    }
  }
  assert.ok(links.includes("/signup?role=BUSINESS_OWNER"));
});

test("the exported landing page references local, available styles and scripts", () => {
  const assets = [...html.matchAll(/(?:src|href)="(\/_expo\/[^"?#]+)"/g)];
  assert.ok(assets.length > 0);
  for (const [, asset] of assets) {
    assert.ok(
      existsSync(path.join(root, asset.slice(1))),
      `Missing asset: ${asset}`,
    );
  }
});

test("the landing icon font is exported with its stylesheet", () => {
  const cssAsset = [
    ...html.matchAll(/href="(\/_expo\/static\/css\/landing-[^"]+)"/g),
  ][0]?.[1];
  assert.ok(cssAsset, "Landing stylesheet is missing");
  const css = readFileSync(path.join(root, cssAsset.slice(1)), "utf8");
  assert.match(css, /url\(["']?\/fonts\/routefloww-feather\.ttf/);
  assert.ok(
    readFileSync(path.join(root, "fonts/routefloww-feather.ttf")).length > 0,
  );
});
