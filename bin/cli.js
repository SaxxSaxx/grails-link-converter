#!/usr/bin/env node
import { agentLinks, parseLink } from "../index.js";

const HELP = `Usage: grails-link-converter <link> [options]

Turn a Weidian, Taobao or 1688 link into shopping agent links.

Options:
  --code agent=CODE    use your own affiliate code (repeat for more agents)
  --no-default-codes   do not add the default GRAILS codes
  --agent NAME         only show this agent (repeat for more)
  --json               print JSON
  -h, --help           show this help

In your browser: https://grails.fit/convert`;

const args = process.argv.slice(2);
const codes = {};
const agents = [];
let link = null;
let json = false;
let defaultCodes = true;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "-h" || a === "--help") { console.log(HELP); process.exit(0); }
  else if (a === "--json") json = true;
  else if (a === "--no-default-codes") defaultCodes = false;
  else if (a === "--code") {
    const [k, ...v] = String(args[++i] || "").split("=");
    if (!k || !v.length) { console.error("--code needs agent=CODE"); process.exit(2); }
    codes[k.toLowerCase()] = v.join("=");
  } else if (a === "--agent") agents.push(String(args[++i] || ""));
  else if (!link) link = a;
}

if (!link) { console.error(HELP); process.exit(2); }

const item = parseLink(link);
if (!item) {
  console.error("Link not recognised. Use a Weidian, Taobao, 1688 or agent product link.");
  process.exit(1);
}
const links = agentLinks(link, { codes, defaultCodes, agents: agents.length ? agents : undefined });

if (json) {
  console.log(JSON.stringify({ ...item, links }, null, 2));
} else {
  console.log(item.platform + " " + item.id + "  " + item.url + "\n");
  const w = Math.max(...links.map((l) => l.name.length));
  for (const l of links) console.log(l.name.padEnd(w + 2) + l.url);
}
