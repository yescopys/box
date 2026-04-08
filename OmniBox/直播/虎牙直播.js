// @name 虎牙直播
// @author 
// @description 
// @dependencies: axios, crypto
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/直播/虎牙直播.js


/**
 * ============================================================================
 * 虎牙直播 - OmniBox 爬虫脚本（基于斗鱼模板重构）
 * ============================================================================
 */
const axios = require("axios");
const crypto = require("crypto");
const https = require("https");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ==========
const host = "https://m.huya.com";
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
  timeout: 10000,
  headers: {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "Referer": host,
    "Origin": host
  }
});

const md5 = (text) => crypto.createHash("md5").update(String(text)).digest("hex");

const PLAY_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-G960F Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/81.0.4044.138 Mobile Safari/537.36",
  "Referer": "https://m.huya.com/"
};

async function sniffHuyaPlay(roomId, fallbackName = "嗅探线路") {
  const targets = [
    `https://m.huya.com/${roomId}`,
    `https://www.huya.com/${roomId}`
  ];

  for (const target of targets) {
    try {
      const sniffed = await OmniBox.sniffVideo(target);
      if (sniffed && sniffed.url) {
        return {
          urls: [{ name: fallbackName, url: sniffed.url }],
          parse: 0,
          header: sniffed.header || PLAY_HEADERS
        };
      }
    } catch (e) {
      console.error(`[Huya] 嗅探失败 ${target}:`, e.message);
    }
  }

  return {
    urls: [],
    parse: 0,
    header: PLAY_HEADERS
  };
}

// ========== 分类映射 ==========
const categories = {
  "2135": "一起看",
  "2336": "王者荣耀",
  "1": "网游竞技",
  "2": "单机热游",
  "2168": "颜值",
  "1663": "星秀"
};

// ========== 工具函数 ==========
function parsePlaySources(fromStr, urlStr) {
  const playSources = [];
  if (!fromStr || !urlStr) return playSources;
  const froms = fromStr.split("$$$");
  const urls = urlStr.split("$$$");
  for (let i = 0; i < froms.length; i++) {
    const sourceName = froms[i] || `线路${i + 1}`;
    const episodes = urls[i]
      ? urls[i]
          .split("#")
          .map(item => {
            const [name, playId] = item.split("$");
            return { name: name || "正片", playId: playId || name };
          })
          .filter(e => e.playId)
      : [];
    if (episodes.length > 0) {
      playSources.push({ name: sourceName, episodes });
    }
  }
  return playSources;
}

// ========== 接口实现 ==========

async function home(params) {
  const classes = Object.entries(categories).map(([type_id, type_name]) => ({
    type_id,
    type_name
  }));
  return { class: classes, list: [] };
}

async function category(params) {
  const { categoryId, page } = params;
  const pg = parseInt(page) || 1;
  try {
    const url = `https://www.huya.com/cache.php?m=LiveList&do=getLiveListByPage&gameId=${categoryId}&tagAll=0&page=${pg}`;
    const res = await axiosInstance.get(url);
    const data = res.data?.data || {};
    const rooms = data.datas || [];

    const list = rooms.map(it => ({
      vod_id: it.profileRoom,
      vod_name: it.roomName || it.nick || "虎牙直播",
      vod_pic: it.screenshot,
      vod_remarks: it.liveStatus === "OFF" ? "🔴 已下播" : `${(it.totalCount / 10000).toFixed(1)}万热度`
    }));

    return {
      list,
      page: data.page || pg,
      pagecount: data.totalPage || 999
    };
  } catch (e) {
    console.error("[Huya] 分类请求失败:", e.message);
    return { list: [], page: pg, pagecount: 0 };
  }
}

async function detail(params) {
  const videoId = params.videoId;
  try {
    const api = `https://mp.huya.com/cache.php?m=Live&do=profileRoom&roomid=${videoId}`;
    const res = await axiosInstance.get(api);
    const data = res.data?.data;
    if (!data || !data.profileInfo) throw new Error("API返回数据为空");

    const profileInfo = data.profileInfo;
    const liveData = data.liveData || {};
    const nick = profileInfo.nick || liveData.nick || "虎牙主播";
    const roomName = liveData.introduction || profileInfo.introduction || nick;
    const gameName = liveData.gameFullName || "未知分类";
    const totalCount = liveData.totalCount || profileInfo.activityCount || 0;
    const isLive = data.liveStatus === "ON";

    let vod_play_from = "";
    let vod_play_url = "";

    if (isLive) {
      let streamList = data.stream?.baseSteamInfoList || [];
      if (streamList.length > 0) {
        const priority = { 'AL': 1, 'TX': 2, 'HW': 3, 'HS': 4, 'HY': 5 };
        streamList.sort((a, b) => (priority[a.sCdnType] || 99) - (priority[b.sCdnType] || 99));
        vod_play_from = streamList.map(s => s.sCdnType).join("$$$");
        vod_play_url = streamList
          .map(s => {
            const safeName = roomName.replace(/\$|#/g, " ");
            return `${safeName}$${videoId}_${s.sCdnType}`;
          })
          .join("$$$");
      } else {
        vod_play_from = "默认";
        vod_play_url = `${roomName.replace(/\$|#/g, " ")}$${videoId}_auto`;
      }
    } else {
      vod_play_from = "无信号";
      vod_play_url = "未开播$0";
    }

    const playSources = parsePlaySources(vod_play_from, vod_play_url);

    return {
      list: [{
        vod_id: videoId,
        vod_name: roomName,
        vod_pic: liveData.screenshot || profileInfo.avatar180 || "",
        vod_content: `主播：${nick}\n分类：${gameName}\n热度：${(parseInt(totalCount) / 10000).toFixed(1)}万\n状态：${isLive ? "🟢 直播中" : "🔴 已下播"}`,
        vod_actor: `${nick} (房间号:${videoId})`,
        vod_director: "虎牙直播",
        vod_play_sources: playSources
      }]
    };
  } catch (error) {
    console.error(`[Huya] 获取详情失败 [${videoId}]:`, error.message);
    return { list: [] };
  }
}

async function play(params) {
  const playId = params.playId;
  if (playId === "0" || playId.startsWith("未开播")) {
    return { urls: [], parse: 0, header: {} };
  }

  try {
    let roomId = playId;
    let cdnType = "";
    if (playId.includes("_")) {
      const [r, c] = playId.split("_");
      roomId = r;
      cdnType = c;
    }

    const api = `https://mp.huya.com/cache.php?m=Live&do=profileRoom&roomid=${roomId}`;
    const res = await axiosInstance.get(api);
    const data = res.data?.data;
    if (!data || !data.stream) {
      return await sniffHuyaPlay(roomId);
    }

    const uid = String(data.profileInfo?.uid || 12340000 + Math.floor(Math.random() * 1000));
    let streamList = data.stream.baseSteamInfoList || [];
    if (streamList.length === 0) {
      return await sniffHuyaPlay(roomId);
    }

    let streamInfo = streamList.find(s => s.sCdnType === cdnType);
    if (!streamInfo) streamInfo = streamList[0];

    const liveData = data.liveData || {};
    let bitRateInfo = liveData.bitRateInfo ? JSON.parse(liveData.bitRateInfo) : [];
    const sStreamName = streamInfo.sStreamName;
    const srcUrl = streamInfo.sFlvUrl;
    if (!srcUrl) {
      return await sniffHuyaPlay(roomId);
    }

    const hostUrl = srcUrl.replace(/^https?:\/\//, '').split('/')[0];
    const generateUrl = (ratio) => {
      const seqid = String(parseInt(uid) + Date.now());
      const ctype = "huya_adr";
      const t = "102";
      const wsTime = Math.floor(Date.now() / 1000 + 21600).toString(16);
      const ss = md5(`${seqid}|${ctype}|${t}`);
      const wsSecret = md5(`DWq8BcJ3h6DJt6TY_${uid}_${sStreamName}_${ss}_${wsTime}`);
      const params = new URLSearchParams({
        wsSecret, wsTime, ctype, seqid, uid, fs: "bgct", ver: "1", t, ratio
      });
      return `https://${hostUrl}/src/${sStreamName}.flv?${params.toString()}`;
    };

    const urls = [];
    if (bitRateInfo.length === 0) {
      const url = generateUrl("0");
      if (url) urls.push({ name: "蓝光(原画)", url });
    } else {
      bitRateInfo.sort((a, b) => {
        const rateA = a.iBitRate === 0 ? 99999999 : a.iBitRate;
        const rateB = b.iBitRate === 0 ? 99999999 : b.iBitRate;
        return rateB - rateA;
      });

      bitRateInfo.forEach(r => {
        let qualityName = r.sDisplayName || "";
        if (!qualityName) {
          if (r.iBitRate === 0) qualityName = "蓝光";
          else if (r.iBitRate >= 4000) qualityName = "蓝光";
          else if (r.iBitRate >= 2000) qualityName = "超清";
          else qualityName = "高清";
        }
        if (qualityName.includes("原画")) qualityName = "蓝光";
        qualityName = qualityName.replace(/\d+M/gi, "");
        if (r.iBitRate > 0) {
          const mbps = Math.round(r.iBitRate / 1000);
          qualityName += `(${mbps}M)`;
        } else {
          qualityName += "(原画)";
        }
        const url = generateUrl(r.iBitRate);
        if (url) urls.push({ name: qualityName, url });
      });
    }

    if (urls.length === 0) {
      return await sniffHuyaPlay(roomId);
    }

    return {
      urls,
      parse: 0,
      header: PLAY_HEADERS
    };
  } catch (e) {
    console.error("[Huya] 播放解析失败:", e.message);
    let roomId = playId;
    if (playId.includes("_")) {
      roomId = playId.split("_")[0];
    }
    return await sniffHuyaPlay(roomId);
  }
}

// ========== 导出 ==========
module.exports = { home, category, detail, play };

// 兼容 T4 框架（可选）
const runner = require("spider_runner");
if (runner && typeof runner.run === "function") {
  runner.run(module.exports);
}
