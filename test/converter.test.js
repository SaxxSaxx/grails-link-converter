import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseLink, agentLinks, AGENTS } from "../index.js";

const WD = "https://weidian.com/item.html?itemID=7234567890";
const TB = "https://item.taobao.com/item.htm?id=712345678901";
const AL = "https://detail.1688.com/offer/654321987654.html";

test("parses raw marketplace links", () => {
  assert.deepEqual(parseLink(WD), { platform: "weidian", id: "7234567890", url: WD });
  assert.equal(parseLink("https://shop123.v.weidian.com/item.html?itemId=55").id, "55");
  assert.equal(parseLink(TB).platform, "taobao");
  assert.equal(parseLink("https://detail.tmall.com/item.htm?id=999&spm=x").id, "999");
  assert.equal(parseLink("https://world.taobao.com/item/123456.htm").id, "123456");
  assert.deepEqual(parseLink(AL), { platform: "1688", id: "654321987654", url: AL });
  assert.equal(parseLink("weidian.com/item.html?itemID=42").id, "42");
});

test("parses agent links back to the source", () => {
  const cases = [
    ["https://www.kakobuy.com/item/details?url=" + encodeURIComponent(WD) + "&affcode=x", "weidian", "7234567890"],
    ["https://www.sugargoo.com/products?productLink=" + encodeURIComponent(encodeURIComponent(TB)), "taobao", "712345678901"],
    ["https://cnfans.com/product?id=55&platform=TAOBAO&ref=1", "taobao", "55"],
    ["https://mulebuy.com/product?shop_type=ali_1688&id=66", "1688", "66"],
    ["https://www.acbuy.com/product?id=77&source=WD", "weidian", "77"],
    ["https://www.zentbuy.com/products/details?id=88&channel=WEIDIAN", "weidian", "88"],
    ["https://www.hipobuy.com/product/1688/99", "1688", "99"],
    ["https://www.litbuy.com/product/taobao/11?inviteCode=a", "taobao", "11"],
    ["https://www.cssbuy.com/item-micro-12.html", "weidian", "12"],
    ["https://www.cssbuy.com/item-1688-13.html", "1688", "13"],
    ["https://www.cssbuy.com/item-14.html", "taobao", "14"],
    ["https://www.uidbuy.com/product/3/15?ref=a", "weidian", "15"],
    ["https://www.oopbuy.com/product/1/16", "taobao", "16"],
  ];
  for (const [url, platform, id] of cases) {
    const r = parseLink(url);
    assert.ok(r, url);
    assert.equal(r.platform, platform, url);
    assert.equal(r.id, id, url);
  }
});

test("rejects junk", () => {
  for (const bad of ["", null, "hello", "https://example.com/?id=1", "https://weidian.com/item.html?itemID=abc", "https://item.taobao.com/item.htm"]) {
    assert.equal(parseLink(bad), null, String(bad));
  }
  assert.deepEqual(agentLinks("https://example.com"), []);
});

test("weidian gives links for every agent", () => {
  const links = agentLinks(WD);
  assert.equal(links.length, AGENTS.length);
  const by = Object.fromEntries(links.map((l) => [l.agent, l.url]));
  assert.equal(by.kakobuy, "https://www.kakobuy.com/item/details?url=" + encodeURIComponent(WD) + "&affcode=skeet");
  assert.equal(by.zentbuy, "https://www.zentbuy.com/products/details?id=7234567890&channel=WEIDIAN&inviteCode=OGM25EYSI");
  assert.equal(by.uidbuy, "https://www.uidbuy.com/product/3/7234567890?ref=N5T3Y4");
  assert.equal(by.mulebuy, "https://mulebuy.com/product?shop_type=weidian&id=7234567890");
  assert.equal(by.oopbuy, "https://www.oopbuy.com/goods/details?id=7234567890&channel=WEIDIAN");
  assert.equal(by.acbuy, "https://www.acbuy.com/product?id=7234567890&source=WD");
  assert.equal(by.cssbuy, "https://www.cssbuy.com/item-micro-7234567890.html");
  assert.equal(by.cnfans, "https://cnfans.com/product?id=7234567890&platform=WEIDIAN");
  assert.ok(by.superbuy.endsWith("&url=" + encodeURIComponent(WD)));
});

test("skips agents with no item link for that platform", () => {
  const tb = agentLinks(TB).map((l) => l.agent);
  assert.ok(!tb.includes("uidbuy"));
  assert.ok(tb.includes("zentbuy"));
  const al = agentLinks(AL).map((l) => l.agent);
  assert.ok(!al.includes("zentbuy"));
  assert.ok(!al.includes("oopbuy"));
  assert.ok(al.includes("uidbuy"));
});

test("every link round-trips through parseLink", () => {
  for (const src of [WD, TB, AL]) {
    const want = parseLink(src);
    for (const l of agentLinks(src)) {
      const got = parseLink(l.url);
      assert.ok(got, l.url);
      assert.equal(got.id, want.id, l.url);
      assert.equal(got.platform, want.platform, l.url);
    }
  }
});

test("custom codes, no default codes, agent filter", () => {
  const mine = agentLinks(WD, { codes: { kakobuy: "me", cnfans: "c 1" }, agents: ["kakobuy", "cnfans"] });
  assert.equal(mine.length, 2);
  assert.ok(mine[0].url.endsWith("&affcode=me"));
  assert.ok(mine[1].url.endsWith("&ref=c%201"));
  const plain = agentLinks(WD, { defaultCodes: false });
  for (const l of plain) {
    assert.ok(!/affcode=|inviteCode=|ref=|memberId=|promotionCode=/.test(l.url), l.url);
  }
});

test("cli prints links and json", () => {
  const cli = fileURLToPath(new URL("../bin/cli.js", import.meta.url));
  const out = execFileSync(process.execPath, [cli, WD]).toString();
  assert.match(out, /KakoBuy\s+https:\/\/www\.kakobuy\.com/);
  const j = JSON.parse(execFileSync(process.execPath, [cli, TB, "--json", "--agent", "litbuy", "--no-default-codes"]).toString());
  assert.equal(j.platform, "taobao");
  assert.deepEqual(j.links, [{ agent: "litbuy", name: "LitBuy", url: "https://www.litbuy.com/product/taobao/712345678901" }]);
});
