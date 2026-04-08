// @name 哔哩教育
// @author 
// @description 刮削：不支持，弹幕：支持，嗅探：不支持，登录：支持
// @dependencies: axios
// @version 1.0.4
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/教育/哔哩教育.js

const axios = require("axios");
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
const BILI_COOKIE = process.env.BILI_COOKIE || "";

const BILI_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://www.bilibili.com",
  ...(BILI_COOKIE ? { Cookie: BILI_COOKIE } : {}),
};

const isLoggedIn = () => Boolean(BILI_COOKIE && BILI_COOKIE.includes("SESSDATA="));

// ==================== 教育分类 ====================
const CLASSES = [
  { type_id: "1年级语文", type_name: "1年级语文" },
  { type_id: "1年级数学", type_name: "1年级数学" },
  { type_id: "1年级英语", type_name: "1年级英语" },
  { type_id: "2年级语文", type_name: "2年级语文" },
  { type_id: "2年级数学", type_name: "2年级数学" },
  { type_id: "2年级英语", type_name: "2年级英语" },
  { type_id: "3年级语文", type_name: "3年级语文" },
  { type_id: "3年级数学", type_name: "3年级数学" },
  { type_id: "3年级英语", type_name: "3年级英语" },
  { type_id: "4年级语文", type_name: "4年级语文" },
  { type_id: "4年级数学", type_name: "4年级数学" },
  { type_id: "4年级英语", type_name: "4年级英语" },
  { type_id: "5年级语文", type_name: "5年级语文" },
  { type_id: "5年级数学", type_name: "5年级数学" },
  { type_id: "5年级英语", type_name: "5年级英语" },
  { type_id: "6年级语文", type_name: "6年级语文" },
  { type_id: "6年级数学", type_name: "6年级数学" },
  { type_id: "6年级英语", type_name: "6年级英语" },
  { type_id: "7年级语文", type_name: "7年级语文" },
  { type_id: "7年级数学", type_name: "7年级数学" },
  { type_id: "7年级英语", type_name: "7年级英语" },
  { type_id: "7年级历史", type_name: "7年级历史" },
  { type_id: "7年级地理", type_name: "7年级地理" },
  { type_id: "7年级生物", type_name: "7年级生物" },
  { type_id: "7年级物理", type_name: "7年级物理" },
  { type_id: "7年级化学", type_name: "7年级化学" },
  { type_id: "8年级语文", type_name: "8年级语文" },
  { type_id: "8年级数学", type_name: "8年级数学" },
  { type_id: "8年级英语", type_name: "8年级英语" },
  { type_id: "8年级历史", type_name: "8年级历史" },
  { type_id: "8年级地理", type_name: "8年级地理" },
  { type_id: "8年级生物", type_name: "8年级生物" },
  { type_id: "8年级物理", type_name: "8年级物理" },
  { type_id: "8年级化学", type_name: "8年级化学" },
  { type_id: "9年级语文", type_name: "9年级语文" },
  { type_id: "9年级数学", type_name: "9年级数学" },
  { type_id: "9年级英语", type_name: "9年级英语" },
  { type_id: "9年级历史", type_name: "9年级历史" },
  { type_id: "9年级地理", type_name: "9年级地理" },
  { type_id: "9年级生物", type_name: "9年级生物" },
  { type_id: "9年级物理", type_name: "9年级物理" },
  { type_id: "9年级化学", type_name: "9年级化学" },
  { type_id: "高一语文", type_name: "高一语文" },
  { type_id: "高一数学", type_name: "高一数学" },
  { type_id: "高一英语", type_name: "高一英语" },
  { type_id: "高一历史", type_name: "高一历史" },
  { type_id: "高一地理", type_name: "高一地理" },
  { type_id: "高一生物", type_name: "高一生物" },
  { type_id: "高一思想政治", type_name: "高一思想政治" },
  { type_id: "高一物理", type_name: "高一物理" },
  { type_id: "高一化学", type_name: "高一化学" },
  { type_id: "高二语文", type_name: "高二语文" },
  { type_id: "高二数学", type_name: "高二数学" },
  { type_id: "高二英语", type_name: "高二英语" },
  { type_id: "高二历史", type_name: "高二历史" },
  { type_id: "高二地理", type_name: "高二地理" },
  { type_id: "高二生物", type_name: "高二生物" },
  { type_id: "高二思想政治", type_name: "高二思想政治" },
  { type_id: "高二物理", type_name: "高二物理" },
  { type_id: "高二化学", type_name: "高二化学" },
  { type_id: "高三语文", type_name: "高三语文" },
  { type_id: "高三数学", type_name: "高三数学" },
  { type_id: "高三英语", type_name: "高三英语" },
  { type_id: "高三历史", type_name: "高三历史" },
  { type_id: "高三地理", type_name: "高三地理" },
  { type_id: "高三生物", type_name: "高三生物" },
  { type_id: "高三思想政治", type_name: "高三思想政治" },
  { type_id: "高三物理", type_name: "高三物理" },
  { type_id: "高三化学", type_name: "高三化学" },
  { type_id: "奥数", type_name: "奥数" },
  { type_id: "奥林匹克物理", type_name: "奥物" },
  { type_id: "奥林匹克化学", type_name: "奥化" },
  { type_id: "高中信息技术", type_name: "高中信息技术" },
];

const QUALITY_NAME_MAP = {
  127: "8K 超高清",
  126: "杜比视界",
  125: "HDR 真彩色",
  120: "4K 超清",
  116: "1080P60 高帧率",
  112: "1080P+ 高码率",
  80: "1080P 高清",
  74: "720P60 高帧率",
  64: "720P 高清",
  32: "480P 清晰",
  16: "360P 流畅",
};

function logInfo(msg) {
  OmniBox.log("info", `[BILI-EDU] ${msg}`);
}

function logError(msg, err) {
  OmniBox.log("error", `[BILI-EDU] ${msg}: ${err?.message || err}`);
}

function fixCover(url) {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

function formatDuration(seconds) {
  const sec = parseInt(seconds, 10) || 0;
  if (sec <= 0) return "00:00";
  const minutes = Math.floor(sec / 60);
  const secs = sec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatSearchDuration(duration) {
  if (!duration || typeof duration !== "string") return "00:00";
  const parts = duration.split(":");
  return parts.length === 2 ? duration : "00:00";
}

async function home(params) {
  try {
    const { data } = await axios.get("https://api.bilibili.com/x/web-interface/search/type", {
      headers: BILI_HEADERS,
      params: {
        search_type: "video",
        keyword: "启蒙", 
        page: 1,
      },
    });

    const list = (data?.data?.result || [])
      .filter((item) => item.type === "video")
      .map((item) => ({
        vod_id: String(item.aid || ""),
        vod_name: String(item.title || "").replace(/<[^>]*>/g, ""),
        vod_pic: fixCover(item.pic),
        vod_remarks: formatSearchDuration(item.duration),
      }));

    return {
      class: CLASSES,
      list,
    };
  } catch (error) {
    logError("首页获取失败", error);
    return { class: CLASSES, list: [] };
  }
}

async function category(params) {
  const keyword = params.categoryId || "";
  const page = Math.max(1, parseInt(params.page, 10) || 1);
  if (!keyword) {
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }

  try {
    const { data } = await axios.get("https://api.bilibili.com/x/web-interface/search/type", {
      headers: BILI_HEADERS,
      params: {
        search_type: "video",
        keyword,
        page,
      },
    });

    const list = (data?.data?.result || [])
      .filter((item) => item.type === "video")
      .map((item) => ({
        vod_id: String(item.aid || ""),
        vod_name: String(item.title || "").replace(/<[^>]*>/g, ""),
        vod_pic: fixCover(item.pic),
        vod_remarks: formatSearchDuration(item.duration),
      }));

    return {
      page,
      pagecount: data?.data?.numPages || 1,
      total: data?.data?.numResults || list.length,
      list,
    };
  } catch (error) {
    logError("分类获取失败", error);
    return { page, pagecount: 0, total: 0, list: [] };
  }
}

async function search(params) {
  return category({
    categoryId: params.keyword || params.wd || "",
    page: params.page,
  });
}

async function detail(params) {
  const videoId = params.videoId;
  if (!videoId) return { list: [] };

  try {
    const { data } = await axios.get(`https://api.bilibili.com/x/web-interface/view?aid=${videoId}`, {
      headers: BILI_HEADERS,
    });

    const video = data?.data;
    if (!video) return { list: [] };

    const episodes = (video.pages || []).map((p, i) => {
      const part = p.part || `第${i + 1}集`;
      return {
        name: part,
        playId: `${videoId}_${p.cid}`,
      };
    });

    return {
      list: [
        {
          vod_id: String(videoId),
          vod_name: String(video.title || "").replace(/<[^>]*>/g, ""),
          vod_pic: fixCover(video.pic),
          vod_content: String(video.desc || ""),
          vod_play_sources: [
            {
              name: "B站视频",
              episodes,
            },
          ],
        },
      ],
    };
  } catch (error) {
    logError("详情获取失败", error);
    return { list: [] };
  }
}

async function play(params) {
  let playId = params.playId || "";
  const flag = params.flag || "";

  if (!playId) {
    return { urls: [], parse: 1, header: {}, flag };
  }

  const idParts = playId.split("_");
  if (idParts.length < 2) {
    return {
      urls: [{ name: "播放", url: playId }],
      parse: /\.(m3u8|mp4|flv)$/i.test(playId) ? 0 : 1,
      header: {},
      flag,
    };
  }

  const avid = idParts[0];
  const cid = idParts[1];
  const loggedIn = isLoggedIn();

  const qualityList = loggedIn
    ? [127, 126, 125, 120, 116, 112, 80, 74, 64, 32, 16]
    : [80, 64, 32, 16];

  const headers = {
    ...BILI_HEADERS,
    Referer: `https://www.bilibili.com/video/av${avid}`,
    Origin: "https://www.bilibili.com",
  };

  const qualitySet = new Set();
  const availableQualities = [];

  for (const qn of qualityList) {
    const useDash = qn > 116;
    try {
      const { data } = await axios.get("https://api.bilibili.com/x/player/playurl", {
        headers,
        params: {
          avid,
          cid,
          qn,
          fnval: useDash ? 4048 : 1,
          fourk: qn >= 120 ? 1 : 0,
          ...(!loggedIn ? { try_look: 1 } : {}),
        },
      });

      if (data?.code !== 0 || !data?.data) continue;

      const payload = data.data;
      const actualQn = payload.quality || qn;
      if (qualitySet.has(actualQn)) continue;
      qualitySet.add(actualQn);

      if (payload.dash?.video?.length) {
        const bestVideo = [...payload.dash.video].sort((a, b) => {
          if ((b.id || 0) !== (a.id || 0)) return (b.id || 0) - (a.id || 0);
          if ((b.bandwidth || 0) !== (a.bandwidth || 0)) return (b.bandwidth || 0) - (a.bandwidth || 0);
          return (b.width || 0) - (a.width || 0);
        })[0];

        const bestAudio = [...(payload.dash.audio || [])].sort((a, b) => (b.bandwidth || 0) - (a.bandwidth || 0))[0];

        if (bestVideo) {
          availableQualities.push({
            name: QUALITY_NAME_MAP[actualQn] || `DASH ${bestVideo.width || "?"}p`,
            url: bestVideo.base_url || bestVideo.baseUrl,
            qn: actualQn,
            audioUrl: bestAudio?.base_url || bestAudio?.baseUrl || "",
          });
        }
      } else if (payload.durl?.[0]?.url) {
        availableQualities.push({
          name: QUALITY_NAME_MAP[actualQn] || `画质${actualQn}`,
          url: payload.durl[0].url,
          qn: actualQn,
          audioUrl: "",
        });
      }
    } catch {
      // 忽略单个画质异常，继续尝试其他画质
    }
  }

  if (availableQualities.length === 0) {
    return {
      urls: [{ name: "播放", url: playId }],
      parse: 1,
      header: headers,
      flag,
    };
  }

  availableQualities.sort((a, b) => b.qn - a.qn);

  const urls = availableQualities.map((q) => ({
    name: q.name,
    url: q.url,
  }));

  const response = {
    urls,
    parse: 0,
    header: {
      "User-Agent": headers["User-Agent"],
      Referer: headers.Referer,
      Origin: headers.Origin,
    },
    flag,
    danmaku: [{ name: "B站弹幕", url: `https://api.bilibili.com/x/v1/dm/list.so?oid=${cid}` }],
  };

  if (availableQualities[0]?.audioUrl) {
    response.extra = { audio: availableQualities[0].audioUrl };
  }

  return response;
}

module.exports = {
  home,
  category,
  search,
  detail,
  play,
};

const runner = require("spider_runner");
runner.run(module.exports);
