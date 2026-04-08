// @name 88看球
/**
 * 刮削：不支持
 * 弹幕：不支持
 * 嗅探：不支持
 *
 * 说明：
 * 1. 本脚本由 `本地调试/88看球.js` 转换为 OmniBox 标准模板结构。
 * 2. 接口包含：`home` / `category` / `search` / `detail` / `play`。
 * 3. 详情接口将旧式 `vod_play_from + vod_play_url` 转换为 `vod_play_sources`。
 * 4. `playId` 使用 Base64(JSON) 透传，播放阶段解码后按原逻辑返回 `parse=1`。
 *
 * 环境变量：
 * - `KANQIU_HOST`：88看球域名，默认 `http://www.88kanqiu.cc`
 */

const axios = require("axios");
const http = require("http");
const https = require("https");
const cheerio = require("cheerio");
const CryptoJS = require("crypto-js");
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
const HOST = process.env.KANQIU_HOST || "http://www.88kanqiu.cc";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const DEFAULT_PIC = "https://pic.imgdb.cn/item/657673d6c458853aeff94ab9.jpg";

const DEFAULT_HEADERS = {
  "User-Agent": UA,
  Referer: `${HOST}/`,
};

const axiosInstance = axios.create({
  timeout: 60 * 1000,
  httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
  httpAgent: new http.Agent({ keepAlive: true }),
});

// ==================== 日志工具 ====================
function logInfo(message, data = null) {
  const output = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[88看球] ${output}`);
}

function logError(message, error) {
  OmniBox.log("error", `[88看球] ${message}: ${error?.message || error}`);
}

// ==================== 编解码工具 ====================
function e64(text) {
  try {
    return CryptoJS.enc.Utf8.parse(String(text || "")).toString(CryptoJS.enc.Base64);
  } catch {
    return "";
  }
}

function d64(encodedText) {
  try {
    return CryptoJS.enc.Base64.parse(String(encodedText || "")).toString(CryptoJS.enc.Utf8);
  } catch {
    return "";
  }
}

/**
 * 兼容多种 id 格式，提取真实详情 URL 与展示名称
 * 支持：
 * 1) 新格式：Base64(JSON.stringify({ vid, name }))
 * 2) 旧格式：`${vid}###${encodeURIComponent(name)}`
 * 3) 兜底：直接把入参当 URL
 */
function parseVodId(rawId) {
  const idText = String(rawId || "");
  let realId = idText;
  let displayName = "赛事直播";

  // 新格式：Base64(JSON)
  const jsonText = d64(idText);
  if (jsonText && (jsonText.startsWith("{") || jsonText.startsWith("["))) {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed?.vid) {
        realId = String(parsed.vid);
        displayName = String(parsed.name || displayName);
        return { realId, displayName };
      }
    } catch {
      // 忽略，继续尝试旧格式
    }
  }

  // 旧格式：vid###name
  if (idText.includes("###")) {
    const parts = idText.split("###", 2);
    realId = parts[0] || "";
    displayName = decodeURIComponent(parts[1] || "赛事直播");
    return { realId, displayName };
  }

  return { realId, displayName };
}

/**
 * 从 `-url` 接口返回中提取 links，兼容不同返回形态
 */
function parseLinksFromPlayApiResponse(responseData) {
  const raw = responseData?.data;

  if (Array.isArray(raw?.links)) {
    return raw.links;
  }

  if (typeof raw === "object" && Array.isArray(raw?.links)) {
    return raw.links;
  }

  if (typeof raw !== "string") {
    return [];
  }

  const candidates = [
    raw,
    raw.substring(6, Math.max(6, raw.length - 2)),
  ].filter(Boolean);

  for (const item of candidates) {
    // 尝试直接 JSON
    try {
      const direct = JSON.parse(item);
      if (Array.isArray(direct?.links)) return direct.links;
    } catch {
      // ignore
    }

    // 尝试 Base64(JSON)
    try {
      const decoded = Buffer.from(item, "base64").toString();
      const parsed = JSON.parse(decoded || "{}");
      if (Array.isArray(parsed?.links)) return parsed.links;
    } catch {
      // ignore
    }
  }

  return [];
}

// ==================== 业务工具 ====================
function getClasses() {
  return [
    { type_id: "", type_name: "全部直播" },
    { type_id: "1", type_name: "篮球直播" },
    { type_id: "8", type_name: "足球直播" },
    { type_id: "21", type_name: "其他直播" },
  ];
}

function getFilters() {
  return {
    "1": [
      {
        key: "cateId",
        name: "类型",
        value: [
          { n: "NBA", v: "1" },
          { n: "CBA", v: "2" },
          { n: "篮球综合", v: "4" },
          { n: "纬来体育", v: "21" },
        ],
      },
    ],
    "8": [
      {
        key: "cateId",
        name: "类型",
        value: [
          { n: "英超", v: "8" },
          { n: "西甲", v: "9" },
          { n: "意甲", v: "10" },
          { n: "欧冠", v: "12" },
          { n: "欧联", v: "13" },
          { n: "德甲", v: "14" },
          { n: "法甲", v: "15" },
          { n: "欧国联", v: "16" },
          { n: "足总杯", v: "27" },
          { n: "国王杯", v: "33" },
          { n: "中超", v: "7" },
          { n: "亚冠", v: "11" },
          { n: "足球综合", v: "23" },
          { n: "欧协联", v: "28" },
          { n: "美职联", v: "26" },
        ],
      },
    ],
  };
}

/**
 * 获取分类列表
 * @param {string} type 分类 ID
 * @param {Object} extend 扩展筛选
 * @returns {Promise<{list:Array,page:number,pagecount:number,limit:number}>}
 */
async function getCategoryList(type, extend = {}) {
  try {
    const cateId = extend?.cateId || type || "";
    const path = cateId ? `/match/${cateId}/live` : "";
    const url = `${HOST}${path}`;

    const response = await axiosInstance.get(url, { headers: { ...DEFAULT_HEADERS } });
    const $ = cheerio.load(response.data || "");

    const list = [];
    $(".list-group-item").each((_, element) => {
      const $el = $(element);
      const btnPrimary = $el.find(".btn.btn-primary");

      const time = $el.find(".category-game-time").text()?.trim() || "";
      const gameType = $el.find(".game-type").text()?.trim() || "";
      const teamNames = $el.find(".team-name");
      const homeTeam = teamNames.length > 0 ? teamNames.first().text().trim() : "";
      const awayTeam = teamNames.length > 1 ? teamNames.last().text().trim() : "";

      const name = `${time} ${gameType} ${homeTeam} vs ${awayTeam}`.trim();
      if (!name || name === "vs") return;

      let vid = HOST;
      let remark = "暂无";
      if (btnPrimary.length > 0) {
        vid = `${HOST}${btnPrimary.attr("href") || ""}`;
        remark = btnPrimary.text().trim() || "暂无";
      } else {
        vid = name;
      }

      const imgs = $el.find("img");
      let pic = imgs.length > 0 ? imgs.first().attr("src") : "";
      if (!pic) pic = DEFAULT_PIC;
      if (!String(pic).startsWith("http")) pic = `${HOST}${pic}`;

      const encodedId = e64(JSON.stringify({ vid, name }));
      list.push({
        vod_id: encodedId,
        vod_name: name,
        vod_pic: pic,
        vod_remarks: remark,
      });
    });

    return {
      list,
      page: 1,
      pagecount: 1,
      limit: list.length,
    };
  } catch (error) {
    logError("获取分类列表失败", error);
    return { list: [], page: 1, pagecount: 1, limit: 0 };
  }
}

/**
 * 拉取详情并转换播放源
 * @param {string} rawId 列表中的 vod_id
 * @returns {Promise<Object|null>}
 */
async function getDetailById(rawId) {
  try {
    const { realId, displayName } = parseVodId(rawId);

    if (!realId || realId === HOST) {
      return null;
    }

    const playUrlApi = `${realId}-url`;
    const response = await axiosInstance.get(playUrlApi, {
      headers: {
        ...DEFAULT_HEADERS,
        Referer: realId,
      },
    });

    const links = parseLinksFromPlayApiResponse(response?.data);

    const episodes = links
      .filter((it) => it?.url)
      .map((it, index) => {
        const playData = {
          url: String(it.url || "").replace(/\*\*\*/g, "#"),
          headers: {
            ...DEFAULT_HEADERS,
            Referer: realId,
          },
          name: String(it.name || `直播源${index + 1}`),
        };
        return {
          name: String(it.name || `直播源${index + 1}`),
          playId: e64(JSON.stringify(playData)),
        };
      });

    return {
      vod_id: realId,
      vod_name: displayName,
      vod_pic: "",
      vod_content: "实时体育直播",
      vod_play_sources: [
        {
          name: "88看球",
          episodes,
        },
      ],
    };
  } catch (error) {
    logError("获取详情失败", error);
    return null;
  }
}

// ==================== 标准接口：home ====================
/**
 * 首页数据（分类 + 筛选 + 推荐）
 */
async function home(params) {
  try {
    const classes = getClasses();
    const result = await getCategoryList("");

    return {
      class: classes,
      filters: getFilters(),
      list: result.list || [],
      page: 1,
      pagecount: 1,
      total: (result.list || []).length,
      limit: result.limit || (result.list || []).length,
    };
  } catch (error) {
    logError("home 失败", error);
    return {
      class: getClasses(),
      filters: getFilters(),
      list: [],
      page: 1,
      pagecount: 1,
      total: 0,
      limit: 0,
    };
  }
}

// ==================== 标准接口：category ====================
/**
 * 分类列表
 */
async function category(params) {
  try {
    const type = params?.id || "";
    const extend = params?.extend || params?.filters || {};
    const result = await getCategoryList(type, extend);

    return {
      list: result.list || [],
      page: 1,
      pagecount: 1,
      total: (result.list || []).length,
      limit: result.limit || (result.list || []).length,
    };
  } catch (error) {
    logError("category 失败", error);
    return {
      list: [],
      page: 1,
      pagecount: 1,
      total: 0,
      limit: 0,
    };
  }
}

// ==================== 标准接口：detail ====================
/**
 * 视频详情
 */
async function detail(params) {
  try {
    const id = params?.id || params?.videoId || "";
    const vod = await getDetailById(id);
    return {
      list: vod ? [vod] : [],
    };
  } catch (error) {
    logError("detail 失败", error);
    return { list: [] };
  }
}

// ==================== 标准接口：search ====================
/**
 * 搜索（源站暂无关键词搜索能力）
 */
async function search(params) {
  return {
    list: [],
    page: Number(params?.page || 1),
    pagecount: 1,
    total: 0,
    limit: 0,
  };
}

// ==================== 标准接口：play ==================== 
/**
 * 播放解析
 */
async function play(params) {
  try {
    const encoded = params?.id || params?.playId || "";
    const decoded = d64(encoded);
    const playData = JSON.parse(decoded || "{}");

    if (!playData?.url) {
      return {
        parse: 1,
        url: "",
        header: { ...DEFAULT_HEADERS },
      };
    }

    return {
      parse: 1,
      url: playData.url,
      header: {
        ...DEFAULT_HEADERS,
        ...(playData.headers || {}),
      },
    };
  } catch (error) {
    logError("play 失败", error);
    return {
      parse: 1,
      url: "",
      header: { ...DEFAULT_HEADERS },
    };
  }
}

module.exports = {
  home,
  category,
  detail,
  search,
  play,
};

const runner = require("spider_runner");
runner.run(module.exports);

