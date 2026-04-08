// @name 星星短剧 ᵈᶻ[短]
// @version 1.0.2
// @indexs 1
// @push 0
// @dependencies axios
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/短剧/星星短剧.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

const HOST = "http://read.api.duodutek.com";
const UA = "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36";

// 固定参数（来自原 PHP）
const COMMON_PARAMS = {
  productId: "2a8c14d1-72e7-498b-af23-381028eb47c0",
  vestId: "2be070e0-c824-4d0e-a67a-8f688890cadb",
  channel: "oppo19",
  osType: "android",
  version: "20",
  token: "202509271001001446030204698626"
};

const CATEGORIES = [
  { type_id: "1287", type_name: "甜宠" },
  { type_id: "1288", type_name: "逆袭" },
  { type_id: "1289", type_name: "热血" },
  { type_id: "1290", type_name: "现代" },
  { type_id: "1291", type_name: "古代" }
];

function text(v) {
  return String(v == null ? "" : v).trim();
}

async function apiGet(path, params = {}) {
  const url = `${HOST}${path}?${new URLSearchParams({ ...COMMON_PARAMS, ...params }).toString()}`;
  const res = await OmniBox.request(url, {
    method: "GET",
    headers: { "User-Agent": UA }
  });
  if (res.statusCode !== 200) throw new Error(`HTTP ${res.statusCode}`);
  return JSON.parse(res.body || "{}") || {};
}

function mapVod(v) {
  return {
    vod_id: `${v.id}@@${v.name}@@${text(v.introduction)}`,
    vod_name: text(v.name),
    vod_pic: text(v.icon),
    vod_remarks: `${text(v.heat)}万播放`
  };
}

async function home(params, context) {
  try {
    const list = (await category({ categoryId: "1287", page: 1 }, context)).list || [];
    return {
      class: CATEGORIES,
      list: list.slice(0, 12),
      filters: {}
    };
  } catch (e) {
    await OmniBox.log("error", `[home] ${e.message}`);
    return { class: CATEGORIES, list: [], filters: {} };
  }
}

async function category(params, context) {
  try {
    const tid = text(params?.categoryId || "1287");
    const page = Number(params?.page || 1);
    const json = await apiGet("/novel-api/app/pageModel/getResourceById", {
      resourceId: tid,
      pageNum: String(page),
      pageSize: "10"
    });
    const list = (json?.data?.datalist || []).map(mapVod);
    const total =
      Number(json?.data?.total) ||
      Number(json?.data?.totalCount) ||
      Number(json?.total) ||
      list.length;
    return {
      page,
      pagecount: 999,
      total,
      list
    };
  } catch (e) {
    await OmniBox.log("error", `[category] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const vid = text(params?.videoId || "");
    if (!vid) return { list: [] };

    let bookId = "";
    let bookName = "";
    let intro = "";
    const parts = vid.split("@@");
    if (parts.length >= 2) {
      bookId = parts[0];
      bookName = parts[1];
      intro = parts[2] || "";
    } else {
      const parts2 = vid.split("@");
      bookId = parts2[0];
      intro = parts2[1] || "";
    }

    const json = await apiGet("/novel-api/basedata/book/getChapterList", { bookId });
    const chapters = json?.data || [];
    const episodes = [];

    chapters.forEach((ch, idx) => {
      const url = ch?.shortPlayList?.[0]?.chapterShortPlayVoList?.[0]?.shortPlayUrl;
      if (url) episodes.push({ name: `第${idx + 1}集`, playId: url });
    });

    const vod = {
      vod_id: vid,
      vod_name: bookName || "",
      vod_content: intro,
      vod_play_sources: episodes.length ? [{ name: "短剧专线", episodes }] : []
    };

    return { list: [vod] };
  } catch (e) {
    await OmniBox.log("error", `[detail] ${e.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  // 原脚本未实现搜索，保持空结果
  const page = Number(params?.page || 1);
  return { page, pagecount: 0, total: 0, list: [] };
}

async function play(params, context) {
  try {
    const playId = text(params?.playId || "");
    const flag = text(params?.flag || "短剧专线");
    if (!playId) throw new Error("playId 为空");
    return {
      urls: [{ name: "播放", url: playId }],
      flag,
      header: { "User-Agent": UA },
      parse: 0
    };
  } catch (e) {
    await OmniBox.log("error", `[play] ${e.message}`);
    return { url: "", flag: text(params?.flag || "短剧专线"), header: {} };
  }
}

module.exports = { home, category, detail, search, play };
runner.run(module.exports);
