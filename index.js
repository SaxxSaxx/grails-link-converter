/* grails-link-converter
 * Turn a Weidian, Taobao or 1688 product link (or an agent link) into
 * shopping agent links. No dependencies. Works in Node 18+ and browsers.
 * Same logic as the converter on https://grails.fit/convert
 */

/* Default affiliate codes are the GRAILS codes used on https://grails.fit.
 * Pass your own with agentLinks(url, { codes: { kakobuy: "yours" } }),
 * or turn them all off with { defaultCodes: false }. */
export const DEFAULT_CODES = Object.freeze({
  kakobuy: "skeet",
  zentbuy: "OGM25EYSI",
  litbuy: "SKEET",
  uidbuy: "N5T3Y4",
  wheebuy: "GRAILS",
  hipobuy: "L3P6KZ3ND",
  sugargoo: "3754571762041425116",
  orientdig: "100248397",
});

export const PLATFORMS = ["weidian", "taobao", "1688"];

function canonical(platform, id) {
  if (platform === "weidian") return "https://weidian.com/item.html?itemID=" + id;
  if (platform === "taobao") return "https://item.taobao.com/item.htm?id=" + id;
  return "https://detail.1688.com/offer/" + id + ".html";
}

function result(platform, id) {
  if (!platform || id == null) return null;
  id = String(id);
  if (!/^\d+$/.test(id)) return null;
  return { platform, id, url: canonical(platform, id) };
}

function getParam(s, name) {
  const m = new RegExp("[?&]" + name + "=([^&#]*)", "i").exec(s);
  if (!m) return null;
  try { return decodeURIComponent(m[1].replace(/\+/g, " ")); } catch { return m[1]; }
}

const CHANNEL = { WEIDIAN: "weidian", WD: "weidian", TAOBAO: "taobao", TB: "taobao", ALI_1688: "1688", AL: "1688", "1688": "1688" };

/**
 * Parse a product link.
 * @param {string} input marketplace link or agent link
 * @returns {{platform: "weidian"|"taobao"|"1688", id: string, url: string} | null}
 */
export function parseLink(input, depth = 0) {
  let s = String(input || "").trim();
  if (!s || depth > 3) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  let host;
  try { host = new URL(s).hostname.toLowerCase(); } catch { return null; }
  let m;
  const is = (re) => re.test(host);

  // Raw marketplaces
  if (is(/(^|\.)tmall\.com$/)) return result("taobao", getParam(s, "id"));
  if (is(/(^|\.)taobao\.com$/)) {
    let id = getParam(s, "id");
    if (!id) { m = /\/item\/(\d+)\.htm/.exec(s); id = m && m[1]; }
    return result("taobao", id);
  }
  if (is(/(^|\.)weidian\.com$/)) {
    return result("weidian", getParam(s, "itemID") || getParam(s, "itemId") || getParam(s, "item_id"));
  }
  if (is(/(^|\.)1688\.com$/)) {
    m = /offer\/(\d+)\.html/.exec(s);
    return result("1688", m && m[1]);
  }

  // Agents that carry the raw link in a query param
  const inner = getParam(s, "url") || getParam(s, "productLink");
  if (inner && /(weidian|taobao|tmall|1688)\./i.test(inner)) {
    let u = inner;
    if (/^https?%3A/i.test(u)) { try { u = decodeURIComponent(u); } catch { /* keep */ } }
    return parseLink(u, depth + 1);
  }

  // Agents with platform + id in the query
  const plat = getParam(s, "platform") || getParam(s, "channel") || getParam(s, "source") || getParam(s, "shop_type");
  const qid = getParam(s, "id");
  if (plat && qid) {
    const p = CHANNEL[plat.toUpperCase()];
    if (p) return result(p, qid);
  }

  // Path styles: /product/weidian/123 (LitBuy, HipoBuy)
  m = /\/product\/(weidian|taobao|1688)\/(\d+)/i.exec(s);
  if (m) return result(m[1].toLowerCase(), m[2]);

  // CSSBuy: item-micro-<id> (Weidian), item-1688-<id>, item-<id> (Taobao)
  if (is(/(^|\.)cssbuy\.com$/)) {
    m = /item-micro-(\d+)/.exec(s); if (m) return result("weidian", m[1]);
    m = /item-1688-(\d+)/.exec(s); if (m) return result("1688", m[1]);
    m = /item-(\d+)/.exec(s); if (m) return result("taobao", m[1]);
    return null;
  }

  // UIDBuy: /product/3/<id> = Weidian, /product/1/<id> = 1688
  if (is(/(^|\.)uidbuy\.com$/)) {
    m = /\/product\/([13])\/(\d+)/.exec(s);
    if (m) return result(m[1] === "3" ? "weidian" : "1688", m[2]);
    return null;
  }

  // OopBuy family (Oopbuy, WheeBuy, ZentBuy): /product/<n>/<id>, 0 = 1688, 1 = Taobao, 2 = Weidian
  if (is(/(^|\.)(oopbuy|wheebuy|zentbuy)\.com$/)) {
    m = /\/product\/([012])\/(\d+)/.exec(s);
    if (m) return result({ 0: "1688", 1: "taobao", 2: "weidian" }[m[1]], m[2]);
  }
  return null;
}

function qs(base, params) {
  const s = Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] != null)
    .map((k) => k + "=" + params[k])
    .join("&");
  return s ? base + "?" + s : base;
}

const UPPER = { weidian: "WEIDIAN", taobao: "TAOBAO", 1688: "ALI_1688" };

/* Each agent: key, name, the query param that holds the affiliate code
 * (null when there is none), and a build function. build returns null when the
 * agent has no item link for that platform. */
export const AGENTS = [
  { key: "kakobuy", name: "KakoBuy", param: "affcode",
    build: (p, id, url, c) => qs("https://www.kakobuy.com/item/details", { url: encodeURIComponent(url), affcode: c }) },
  { key: "zentbuy", name: "ZentBuy", param: "inviteCode",
    build: (p, id, url, c) => (p === "1688" ? null
      : qs("https://www.zentbuy.com/products/details", { id, channel: UPPER[p], inviteCode: c })) },
  { key: "litbuy", name: "LitBuy", param: "inviteCode",
    build: (p, id, url, c) => qs("https://www.litbuy.com/product/" + p + "/" + id, { inviteCode: c }) },
  { key: "uidbuy", name: "UIDBuy", param: "ref",
    build: (p, id, url, c) => (p === "taobao" ? null
      : qs("https://www.uidbuy.com/product/" + (p === "weidian" ? "3" : "1") + "/" + id, { ref: c })) },
  { key: "wheebuy", name: "WheeBuy", param: "inviteCode",
    build: (p, id, url, c) => (p === "weidian"
      ? qs("https://wheebuy.com/goods/details", { id, channel: "WEIDIAN", inviteCode: c })
      : qs("https://wheebuy.com/product/" + (p === "taobao" ? "1" : "0") + "/" + id, { inviteCode: c })) },
  { key: "cnfans", name: "CNFans", param: "ref",
    build: (p, id, url, c) => qs("https://cnfans.com/product", { id, platform: UPPER[p], ref: c }) },
  { key: "mulebuy", name: "Mulebuy", param: null,
    build: (p, id) => qs("https://mulebuy.com/product", { shop_type: p === "1688" ? "ali_1688" : p, id }) },
  { key: "oopbuy", name: "Oopbuy", param: null,
    build: (p, id) => (p === "weidian" ? qs("https://www.oopbuy.com/goods/details", { id, channel: "WEIDIAN" })
      : p === "taobao" ? "https://www.oopbuy.com/product/1/" + id : null) },
  { key: "acbuy", name: "ACBuy", param: null,
    build: (p, id) => qs("https://www.acbuy.com/product", { id, source: { weidian: "WD", taobao: "TB", 1688: "AL" }[p] }) },
  { key: "cssbuy", name: "CSSBuy", param: "promotionCode",
    build: (p, id, url, c) => qs("https://www.cssbuy.com/" + (p === "weidian" ? "item-micro-" : p === "1688" ? "item-1688-" : "item-") + id + ".html", { promotionCode: c }) },
  { key: "superbuy", name: "Superbuy", param: null,
    build: (p, id, url) => "https://www.superbuy.com/en/page/buy/?nTag=Home-search&from=search-input&_search=url&url=" + encodeURIComponent(url) },
  { key: "sugargoo", name: "Sugargoo", param: "memberId",
    build: (p, id, url, c) => qs("https://www.sugargoo.com/products", { productLink: encodeURIComponent(url), memberId: c }) },
  { key: "hipobuy", name: "HipoBuy", param: "inviteCode",
    build: (p, id, url, c) => qs("https://www.hipobuy.com/product/" + p + "/" + id, { inviteCode: c }) },
  { key: "orientdig", name: "OrientDig", param: "ref",
    build: (p, id, url, c) => qs("https://orientdig.com/product", { platform: UPPER[p], id, ref: c }) },
];

/**
 * Build agent links for a product link.
 * @param {string} input marketplace link or agent link
 * @param {{codes?: Record<string,string>, defaultCodes?: boolean, agents?: string[]}} [opts]
 *   codes: your own affiliate codes by agent key (merged over the defaults).
 *   defaultCodes: false to drop the GRAILS default codes.
 *   agents: only return these agent keys.
 * @returns {{agent: string, name: string, url: string}[]} empty array when the link is not recognised
 */
export function agentLinks(input, opts = {}) {
  const item = parseLink(input);
  if (!item) return [];
  const codes = Object.assign({}, opts.defaultCodes === false ? {} : DEFAULT_CODES, opts.codes || {});
  const only = opts.agents ? opts.agents.map((a) => String(a).toLowerCase()) : null;
  const out = [];
  for (const a of AGENTS) {
    if (only && !only.includes(a.key)) continue;
    const code = a.param && codes[a.key] ? encodeURIComponent(codes[a.key]) : "";
    const url = a.build(item.platform, item.id, item.url, code);
    if (url) out.push({ agent: a.key, name: a.name, url });
  }
  return out;
}

export default { parseLink, agentLinks, AGENTS, DEFAULT_CODES, PLATFORMS };
