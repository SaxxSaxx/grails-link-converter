# grails-link-converter

Turn a Weidian, Taobao or 1688 product link into shopping agent links: KakoBuy, ZentBuy, LitBuy, UIDBuy, WheeBuy, CNFans, Mulebuy, Oopbuy, ACBuy, CSSBuy, Superbuy, Sugargoo, HipoBuy and OrientDig.

**Use it in your browser: https://grails.fit/convert**

This is the same converter that runs on [GRAILS](https://grails.fit), a reps finds site with QC photos and links for every agent. This repo is the small open source version: one file, no dependencies, works in Node 18+ and in the browser.

It also works the other way. Paste an agent link (for example a KakoBuy or CNFans link) and it finds the original Weidian, Taobao or 1688 item, then gives you links for all the other agents.

## Install

```sh
npm install github:SaxxSaxx/grails-link-converter
```

Or copy `index.js` into your project. It has no dependencies.

## Command line

```sh
npx github:SaxxSaxx/grails-link-converter "https://weidian.com/item.html?itemID=7234567890"
```

```
weidian 7234567890  https://weidian.com/item.html?itemID=7234567890

KakoBuy    https://www.kakobuy.com/item/details?url=https%3A%2F%2Fweidian.com%2Fitem.html%3FitemID%3D7234567890&affcode=skeet
ZentBuy    https://www.zentbuy.com/products/details?id=7234567890&channel=WEIDIAN&inviteCode=OGM25EYSI
LitBuy     https://www.litbuy.com/product/weidian/7234567890?inviteCode=SKEET
...
```

Options:

| Option | What it does |
| --- | --- |
| `--code agent=CODE` | Use your own affiliate code. Repeat for more agents. |
| `--no-default-codes` | Do not add the default GRAILS codes. |
| `--agent NAME` | Only show this agent. Repeat for more. |
| `--json` | Print JSON. |

## JavaScript

```js
import { parseLink, agentLinks } from "grails-link-converter";

parseLink("https://item.taobao.com/item.htm?id=712345678901");
// { platform: "taobao", id: "712345678901", url: "https://item.taobao.com/item.htm?id=712345678901" }

agentLinks("https://weidian.com/item.html?itemID=7234567890", {
  codes: { kakobuy: "yourcode", cnfans: "12345" }, // your own codes
  defaultCodes: false,                             // drop the GRAILS codes
  agents: ["kakobuy", "cnfans", "mulebuy"],        // optional filter
});
// [ { agent: "kakobuy", name: "KakoBuy", url: "https://www.kakobuy.com/item/details?url=...&affcode=yourcode" }, ... ]
```

- `parseLink(url)` returns `{ platform, id, url }` or `null`. `platform` is `weidian`, `taobao` or `1688`. `url` is the clean marketplace link.
- `agentLinks(url, options)` returns a list of `{ agent, name, url }`. It returns an empty list when the link is not recognised.
- Agents that have no item page for a platform are left out (for example UIDBuy for Taobao).

In the browser:

```html
<script type="module">
  import { agentLinks } from "https://cdn.jsdelivr.net/gh/SaxxSaxx/grails-link-converter@main/index.js";
  console.log(agentLinks("https://detail.1688.com/offer/654321987654.html"));
</script>
```

## Supported links

Input: Weidian, Taobao, Tmall and 1688 item links, plus agent links from KakoBuy, Superbuy, Sugargoo, CNFans, Mulebuy, ACBuy, ZentBuy, WheeBuy, Oopbuy, LitBuy, HipoBuy, CSSBuy and UIDBuy.

Output:

| Agent | Weidian | Taobao | 1688 | Code param |
| --- | --- | --- | --- | --- |
| KakoBuy | yes | yes | yes | `affcode` |
| ZentBuy | yes | yes | no | `inviteCode` |
| LitBuy | yes | yes | yes | `inviteCode` |
| UIDBuy | yes | no | yes | `ref` |
| WheeBuy | yes | yes | yes | `inviteCode` |
| CNFans | yes | yes | yes | `ref` |
| Mulebuy | yes | yes | yes | none |
| Oopbuy | yes | yes | no | none |
| ACBuy | yes | yes | yes | none |
| CSSBuy | yes | yes | yes | `promotionCode` |
| Superbuy | yes | yes | yes | none |
| Sugargoo | yes | yes | yes | `memberId` |
| HipoBuy | yes | yes | yes | `inviteCode` |
| OrientDig | yes | yes | yes | `ref` |

This module does not check if an agent is taking orders right now. https://grails.fit/convert does, and hides agents that are down.

Agent sites change their link formats from time to time. If a link breaks, open an issue or use https://grails.fit/convert, which is kept up to date.

## Affiliate codes

By default the links include the GRAILS affiliate codes (KakoBuy, ZentBuy, LitBuy, UIDBuy, WheeBuy, HipoBuy, Sugargoo, OrientDig). This supports the GRAILS site and does not change the price you pay.

You can use your own codes with `codes` (or `--code` on the command line), or remove all codes with `defaultCodes: false` (or `--no-default-codes`). The default codes are in `DEFAULT_CODES` at the top of `index.js`.

## Tests

```sh
npm test
```

## Links

- Link converter in the browser: https://grails.fit/convert
- GRAILS finds, QC photos and agent guides: https://grails.fit

## License

MIT, see [LICENSE](LICENSE).
