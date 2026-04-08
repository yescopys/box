// @name 贝乐虎
// @author 
// @description 刮削：不支持，弹幕：不支持，嗅探：不支持
// @dependencies: axios
// @version 1.0.3
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/教育/贝乐虎.js

/**
 * ============================================================================
 * 贝乐虎
 * 刮削：不支持
 * 弹幕：不支持
 * 嗅探：不支持
 * ============================================================================
 */
const axios = require("axios");
const http = require("http");
const https = require("https");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ==========
const beilehuConfig = {
  host: "https://vd.ubestkid.com",
  headers: {
    "User-Agent": "IOS_UA",
    "Content-Type": "application/json",
  },
};

const PAGE_LIMIT = 20;

const CLASS_DATA = [
  { type_id: "56", type_name: "热门" },
  { type_id: "57", type_name: "贝乐虎儿歌" },
  { type_id: "58", type_name: "贝乐虎故事" },
  { type_id: "59", type_name: "贝乐虎动画" },
  { type_id: "60", type_name: "贝乐虎音乐剧" },
  { type_id: "61", type_name: "贝乐虎启蒙" },
  { type_id: "62", type_name: "贝乐虎玩具" },
  { type_id: "63", type_name: "贝乐虎手工" },
  { type_id: "64", type_name: "贝乐虎游戏" },
  { type_id: "65", type_name: "贝乐虎亲子" },
  { type_id: "66", type_name: "贝乐虎科普" },
];

const _http = axios.create({
  timeout: 15 * 1000,
  httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
  httpAgent: new http.Agent({ keepAlive: true }),
});

const logInfo = (message, data = null) => {
  const output = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[贝乐虎-DEBUG] ${output}`);
};

const logError = (message, error) => {
  OmniBox.log("error", `[贝乐虎-DEBUG] ${message}: ${error.message || error}`);
};

// ========== 通用函数 ==========
const fetchVideos = async (subcateId, page = 1, keyword = "") => {
  try {
    const url = `${beilehuConfig.host}/api/v1/bv/video`;
    const pdata = {
      age: 1,
      appver: "6.1.9",
      egvip_status: 0,
      svip_status: 0,
      vps: 60,
      subcateId,
      p: page,
    };

    if (keyword) {
      pdata.keyword = keyword;
    }

    const response = await _http.post(url, pdata, {
      headers: beilehuConfig.headers,
    });

    return response.data;
  } catch (error) {
    logError("请求失败", error);
    return null;
  }
};

const formatVideoList = (items) => {
  const list = [];
  if (items && Array.isArray(items)) {
    items.forEach((it) => {
      list.push({
        vod_id: `${it.url}@@${it.title || ""}@@${it.image || ""}`,
        vod_name: it.title || "",
        vod_pic: it.image || "",
        vod_remarks: `👀${it.viewcount || "0"}`,
        vod_time: it.update_time || "",
      });
    });
  }
  return list;
};

const parsePlaySources = (fromStr, urlStr) => {
  const playSources = [];
  if (!fromStr || !urlStr) return playSources;

  const froms = fromStr.split("$$$");
  const urls = urlStr.split("$$$");

  for (let i = 0; i < froms.length; i++) {
    const sourceName = froms[i] || `线路${i + 1}`;
    const sourceItems = urls[i] ? urls[i].split("#") : [];

    const episodes = sourceItems
      .map((item) => {
        const parts = item.split("$");
        const episodeName = parts[0] || "播放";
        const actualUrl = parts[1] || parts[0];
        if (!actualUrl) return null;
        return {
          name: episodeName,
          playId: actualUrl,
        };
      })
      .filter(Boolean);

    if (episodes.length > 0) {
      playSources.push({
        name: sourceName,
        episodes,
      });
    }
  }

  return playSources;
};

// ========== 接口实现 ==========
async function home() {
  try {
    const data = await fetchVideos("56", 1);
    const list = data?.result?.items ? formatVideoList(data.result.items) : [];
    return {
      class: CLASS_DATA,
      list: list.slice(0, PAGE_LIMIT),
    };
  } catch (error) {
    logError("首页推荐错误", error);
    return { class: CLASS_DATA, list: [] };
  }
}

async function category(params) {
  const { categoryId, page } = params;
  const pg = parseInt(page) || 1;
  try {
    const data = await fetchVideos(categoryId, pg);
    const list = data?.result?.items ? formatVideoList(data.result.items) : [];
    const pagecount = data?.result?.total_page || (list.length >= PAGE_LIMIT ? pg + 1 : pg);
    return {
      list,
      page: pg,
      pagecount,
    };
  } catch (error) {
    logError("分类列表错误", error);
    return { list: [], page: pg, pagecount: 1 };
  }
}

async function search(params) {
  const keyword = params.keyword || params.wd || "";
  OmniBox.log("info", `[贝乐虎] 搜索功能未实现，关键词: ${keyword}`);
  return { list: [], page: 1, pagecount: 1 };
}

async function detail(params) {
  const videoId = params.videoId || "";
  try {
    const parts = String(videoId).split("@@");
    if (parts.length < 2) return { list: [] };

    const url = parts[0];
    const title = parts[1] || "";
    const image = parts[2] || "";

    const vod_play_from = "贝乐虎";
    const vod_play_url = `播放$${url}`;
    const playSources = parsePlaySources(vod_play_from, vod_play_url);

    return {
      list: [
        {
          vod_id: videoId,
          vod_name: title,
          vod_pic: image,
          vod_content: title,
          vod_play_sources: playSources,
        },
      ],
    };
  } catch (error) {
    logError("详情获取错误", error);
    return { list: [] };
  }
}

async function play(params) {
  const playId = params.playId;
  if (!playId) {
    return {
      urls: [],
      parse: 0,
      header: beilehuConfig.headers,
    };
  }
  return {
    urls: [{ name: "播放", url: playId }],
    parse: 0,
    header: beilehuConfig.headers,
  };
}

// ========== 导出模块 ==========
module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);
