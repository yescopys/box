// @name DJ音乐[听] - OmniBox
// @version 1.0.4
// @author https://github.com/hjdhnx/drpy-node/blob/main/spider/js/DJ%E9%9F%B3%E4%B9%90%5B%E5%90%AC%5D.js
// @origin https://github.com/hjdhnx/drpy-node/blob/main/spider/js/DJ%E9%9F%B3%E4%B9%90%5B%E5%90%AC%5D.js
// @indexs 1
// @push 0
// @dependencies cheerio
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/音乐/DJ音乐.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

const HOST = "https://www.djuu.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const CATEGORIES = [
  ["1", "迪高串烧"],
  ["2", "慢摇串烧"],
  ["3", "慢歌串烧"],
  ["4", "中文Remix"],
  ["5", "外文Remix"],
  ["6", "HOUSE"],
  ["7", "HOUSE2"],
  ["8", "霓虹风格"],
  ["9", "Mashup"],
  ["10", "中文DISCO"],
  ["11", "外文DISCO"],
].map(([type_id, type_name]) => ({ type_id, type_name }));

function abs(url) {
  if (!url) return "";
  try {
    return new URL(url, HOST).href;
  } catch {
    return url;
  }
}

function splitVodId(vodId = "") {
  const arr = String(vodId).split("@@");
  return {
    id: arr[0] || "",
    name: arr[1] || "",
    pic: arr[2] || "",
    remark: arr[3] || "",
  };
}

function makeVodId({ id = "", name = "", pic = "", remark = "" }) {
  return [id, name, pic, remark].map(v => String(v || "")).join("@@");
}

async function requestText(url) {
  const target = abs(url);
  await OmniBox.log("info", `[request] ${target}`);
  const res = await OmniBox.request(target, {
    method: "GET",
    headers: { "User-Agent": UA, Referer: HOST + "/" },
  });
  if (res.statusCode !== 200) {
    throw new Error(`HTTP ${res.statusCode} @ ${target}`);
  }
  return res.body || "";
}

function parseListFromHtml(html) {
  const $ = cheerio.load(html || "");
  const list = [];
  const rows = $(".list_musiclist tr").toArray().slice(1); // 去掉表头

  rows.forEach((tr) => {
    const $tr = $(tr);
    const a = $tr.find("a[title]").first();
    const name = (a.attr("title") || a.text() || "").trim();
    const href = abs(a.attr("href") || "");
    if (!name || !href) return;

    const pic = abs($tr.find("img").first().attr("src") || "");
    const remark = ($tr.find(".cor999").eq(1).text() || "").trim();

    list.push({
      vod_id: makeVodId({ id: href, name, pic, remark }),
      vod_name: name,
      vod_pic: pic,
      vod_remarks: remark,
      type_id: "music",
      type_name: "音乐",
    });
  });

  return list;
}

async function home(params, context) {
  try {
    const first = await category({ categoryId: "1", page: 1 }, context);
    await OmniBox.log("info", `[home] class=${CATEGORIES.length}, list=${(first.list || []).length}`);
    return {
      class: CATEGORIES,
      list: (first.list || []).slice(0, 12),
      filters: {},
    };
  } catch (e) {
    await OmniBox.log("error", `[home] ${e.message}`);
    return { class: CATEGORIES, list: [], filters: {} };
  }
}

async function category(params, context) {
  try {
    const categoryId = String(params?.categoryId || "1");
    const page = Number(params?.page || 1);
    const path = `/djlist/${categoryId}_${page}.html`;

    const html = await requestText(path);
    const list = parseListFromHtml(html);

    const hasNext = /下一页|next|尾页/.test(html);
    const pagecount = hasNext ? page + 1 : page;
    const total = hasNext ? page * 20 + 1 : (page - 1) * 20 + list.length;

    await OmniBox.log("info", `[category] tid=${categoryId}, page=${page}, list=${list.length}`);
    return { page, pagecount, total, list };
  } catch (e) {
    await OmniBox.log("error", `[category] ${e.message}`);
    return { page: Number(params?.page || 1), pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const { id, name, pic, remark } = splitVodId(params?.videoId || "");
    if (!id) return { list: [] };

    // 源站为音乐播放页，详情简化为单集播放
    const episodes = [{ name: name || "播放", playId: id }];
    const vod = {
      vod_id: params.videoId,
      vod_name: name || "DJ音乐",
      vod_pic: pic || "",
      vod_remarks: remark || "",
      type_id: "music",
      type_name: "音乐",
      vod_content: "DJ音乐源（播放链接在 play 中解析）",
      vod_play_sources: [{ name: "DJ专线", episodes }],
    };

    await OmniBox.log("info", `[detail] id=${id}`);
    return { list: [vod] };
  } catch (e) {
    await OmniBox.log("error", `[detail] ${e.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = String(params?.keyword || "").trim();
    const page = Number(params?.page || 1);
    if (!keyword) return { page: 1, pagecount: 0, total: 0, list: [] };

    const html = await requestText(`/search?musicname=${encodeURIComponent(keyword)}`);
    let list = parseListFromHtml(html);

    // 兼容部分搜索页无 .list_musiclist 的情况：退化抓 a[title]
    if (!list.length) {
      const $ = cheerio.load(html || "");
      const seen = new Set();
      $("a[title]").each((_, el) => {
        const a = $(el);
        const name = (a.attr("title") || a.text() || "").trim();
        const href = abs(a.attr("href") || "");
        if (!name || !href || seen.has(href)) return;
        seen.add(href);
        list.push({
          vod_id: makeVodId({ id: href, name }),
          vod_name: name,
          vod_pic: "",
          vod_remarks: "",
          type_id: "music",
          type_name: "音乐",
        });
      });
    }

    await OmniBox.log("info", `[search] kw=${keyword}, page=${page}, list=${list.length}`);
    return { page, pagecount: 1, total: list.length, list };
  } catch (e) {
    await OmniBox.log("error", `[search] ${e.message}`);
    return { page: Number(params?.page || 1), pagecount: 0, total: 0, list: [] };
  }
}

function parseMusicObject(text) {
  const src = String(text || "");
  const patterns = [
    /var\s+music\s*=\s*(\{[\s\S]*?\})\s*[,;]/,
    /music\s*=\s*(\{[\s\S]*?\})\s*[,;]/,
  ];

  for (const reg of patterns) {
    const m = src.match(reg);
    if (!m) continue;
    let raw = m[1];
    raw = raw
      .replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":')
      .replace(/'/g, '"')
      .replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(raw);
    } catch (e) {
      // 继续尝试下一个规则
    }
  }
  return null;
}

async function play(params, context) {
  try {
    const playId = String(params?.playId || "").trim();
    const flag = String(params?.flag || "DJ专线");
    if (!playId) throw new Error("playId 为空");

    const html = await requestText(playId);
    const tried = [];

    const music = parseMusicObject(html);
    if (music) {
      await OmniBox.log("info", `[play] music keys=${Object.keys(music).join(",")}`);
    } else {
      await OmniBox.log("warn", `[play] music object not found`);
    }

    if (music?.file) {
      const base = new URL(playId, HOST);
      const url = `${base.protocol}//mp4.djuu.com/${music.file}.m4a`;
      await OmniBox.log("info", `[play] hit music.file -> ${url}`);
      return {
        urls: [{ name: "播放", url }],
        flag,
        header: { "User-Agent": UA, Referer: HOST + "/" },
        parse: 0,
      };
    }
    tried.push("music.file");

    const directM4a = html.match(new RegExp(String.raw`https?:\\/\\/[^"'\\s<>]+\\.(?:m4a|mp3)(?:\\?[^"'\\s<>]*)?`, "i"));
    if (directM4a?.[0]) {
      await OmniBox.log("info", `[play] hit direct media -> ${directM4a[0]}`);
      return {
        urls: [{ name: "播放", url: directM4a[0] }],
        flag,
        header: { "User-Agent": UA, Referer: HOST + "/" },
        parse: 0,
      };
    }
    tried.push("direct media regex");

    const fileM = html.match(/file\s*[:=]\s*['\"]([^'\"]+)['\"]/i);
    if (fileM?.[1]) {
      const base = new URL(playId, HOST);
      const url = fileM[1].startsWith("http") ? fileM[1] : `${base.protocol}//mp4.djuu.com/${fileM[1].replace(/^\/+/, "")}.m4a`;
      await OmniBox.log("info", `[play] hit loose file -> ${url}`);
      return {
        urls: [{ name: "播放", url }],
        flag,
        header: { "User-Agent": UA, Referer: HOST + "/" },
        parse: 0,
      };
    }
    tried.push("loose file regex");

    throw new Error(`未提取到播放地址，已尝试: ${tried.join(" | ")}`);
  } catch (e) {
    await OmniBox.log("error", `[play] ${e.message}`);
    return { urls: [], flag: String(params?.flag || "DJ专线"), header: { "User-Agent": UA }, parse: 0 };
  }
}
