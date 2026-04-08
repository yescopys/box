// @name Emby-模板二
// @author
// @description 直连 Emby 接口，TVBox T4 结构输出（刮削：不支持，弹幕：不支持，嗅探：不支持）
// @dependencies: axios
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/Emby/模板二.js

/**
 * ============================================================================
 * Emby[优] - TVBox T4 接口格式脚本
 * ============================================================================
 * 说明：
 * 1. 将本地 Emby 规则脚本改造为 OmniBox 标准 5 方法输出（home/category/search/detail/play）。
 * 2. 结构与注释风格参考「两个BT」脚本，便于统一维护。
 * 3. 配置建议通过环境变量传入，或通过 params.extend 进行覆盖。
 */

const axios = require("axios");
const http = require("http");
const https = require("https");
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
const DEFAULT_CONFIG = {
  host: process.env.EMBY_HOST || "",
  userId: process.env.EMBY_USER_ID || "",
  token: process.env.EMBY_TOKEN || "",
  deviceId: process.env.EMBY_DEVICE_ID || "",
  clientVersion: process.env.EMBY_CLIENT_VERSION || "",
  pageSize: parseInt(process.env.EMBY_PAGE_SIZE || "30", 10) || 30,
};

const BASE_FIELDS = "BasicSyncInfo,CanDelete,Container,PrimaryImageAspectRatio,ProductionYear,Status,EndDate";
const IMAGE_TYPES = "Primary,Backdrop,Thumb,Banner";

const DEVICE_PROFILE = {
  DeviceProfile: {
    MaxStaticBitrate: 140000000,
    MaxStreamingBitrate: 140000000,
    DirectPlayProfiles: [
      {
        Container: "mp4,mkv,webm",
        Type: "Video",
        VideoCodec: "h264,h265,av1,vp9",
        AudioCodec: "aac,mp3,opus,flac",
      },
      { Container: "mp3,aac,flac,opus", Type: "Audio" },
    ],
    TranscodingProfiles: [
      {
        Container: "mp4",
        Type: "Video",
        VideoCodec: "h264",
        AudioCodec: "aac",
        Context: "Streaming",
        Protocol: "http",
      },
      { Container: "aac", Type: "Audio", Context: "Streaming", Protocol: "http" },
    ],
    SubtitleProfiles: [{ Format: "srt,ass,vtt", Method: "External" }],
    CodecProfiles: [
      {
        Type: "Video",
        Codec: "h264",
        ApplyConditions: [{ Condition: "LessThanEqual", Property: "VideoLevel", Value: "62" }],
      },
    ],
    BreakOnNonKeyFrames: true,
  },
};

const axiosInstance = axios.create({
  timeout: 15000,
  httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
  httpAgent: new http.Agent({ keepAlive: true }),
  validateStatus: (status) => status >= 200,
});

// ==================== 日志工具 ====================
const logInfo = (message, data = null) => {
  const output = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[Emby-DEBUG] ${output}`);
};

const logError = (message, error) => {
  OmniBox.log("error", `[Emby-DEBUG] ${message}: ${error?.message || error}`);
};

// ==================== 基础工具 ====================
function normalizeHost(host) {
  const raw = String(host || "").trim();
  if (!raw) return "";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function toInt(value, defaultValue = 0) {
  const num = parseInt(String(value ?? ""), 10);
  return Number.isNaN(num) ? defaultValue : num;
}

function parseExtendParams(extend) {
  if (!extend) return {};
  if (typeof extend === "object") return extend;
  const text = String(extend || "").trim();
  if (!text) return {};
  try {
    const decoded = Buffer.from(text, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch (_) {
    try {
      return JSON.parse(text);
    } catch (error) {
      logError("extend 参数解析失败", error);
      return {};
    }
  }
}

function resolveConfig(params = {}) {
  const ext = parseExtendParams(params.extend || params.config || params.ext);
  const merged = {
    ...DEFAULT_CONFIG,
    ...ext,
  };
  merged.host = normalizeHost(merged.host);
  merged.pageSize = toInt(merged.pageSize, DEFAULT_CONFIG.pageSize);
  return merged;
}

function getHeaders(config, extra = {}) {
  return {
    "X-Emby-Client": "Emby Web",
    "X-Emby-Device-Name": "Android WebView Android",
    "X-Emby-Device-Id": config.deviceId,
    "X-Emby-Client-Version": config.clientVersion,
    "X-Emby-Token": config.token,
    ...extra,
  };
}

function getImageUrl(config, itemId, imageTag) {
  if (!itemId || !imageTag) return "";
  return `${config.host}/emby/Items/${itemId}/Images/Primary?maxWidth=400&tag=${imageTag}&quality=90`;
}

function encodeMeta(obj) {
  try {
    return Buffer.from(JSON.stringify(obj || {}), "utf8").toString("base64");
  } catch {
    return "";
  }
}

function decodeMeta(str) {
  try {
    const raw = Buffer.from(str || "", "base64").toString("utf8");
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

async function requestJson(url, options = {}, config) {
  const start = Date.now();
  try {
    const res = await axiosInstance.request({
      url,
      ...options,
      headers: {
        ...(options.headers || {}),
        ...getHeaders(config),
      },
    });
    const cost = Date.now() - start;
    logInfo(`请求完成 ${url}`, { status: res.status, cost });
    if (res.status >= 400) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.data;
  } catch (error) {
    const cost = Date.now() - start;
    logError(`请求失败 ${url} cost=${cost}ms`, error);
    throw error;
  }
}

function extractList(config, jsonData) {
  return (jsonData?.Items || []).map((item) => {
    const isFolder = ["Folder", "BoxSet", "CollectionFolder"].includes(item.Type);
    return {
      vod_id: String(item.Id || ""),
      vod_name: item.Name || "",
      vod_pic: getImageUrl(config, item.Id, item.ImageTags?.Primary),
      vod_remarks: item.ProductionYear ? String(item.ProductionYear) : "",
      vod_tag: isFolder ? "folder" : "video",
    };
  });
}

async function fetchPlaybackInfo(config, itemId) {
  const url = `${config.host}/emby/Items/${itemId}/PlaybackInfo`;
  return requestJson(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify(DEVICE_PROFILE),
    },
    config
  );
}

async function resolveFirstEpisodeId(config, seriesId) {
  const url = `${config.host}/emby/Shows/${seriesId}/Episodes?` +
    `UserId=${config.userId}&Fields=Overview,PrimaryImageAspectRatio&StartIndex=0&Limit=1&` +
    `SortBy=IndexNumber&SortOrder=Ascending`;

  const data = await requestJson(url, {}, config);
  const first = data?.Items?.[0];
  return first?.Id ? String(first.Id) : "";
}

// ==================== 接口实现 ====================

async function home(params = {}) {
  const config = resolveConfig(params);
  logInfo("进入首页", { host: config.host });

  if (!config.host || !config.userId || !config.token) {
    logError("缺少必要配置", new Error("请配置 EMBY_HOST/EMBY_USER_ID/EMBY_TOKEN"));
    return { class: [], list: [] };
  }

  try {
    const classesUrl = `${config.host}/emby/Users/${config.userId}/Views`;
    const classJson = await requestJson(classesUrl, {}, config);

    const classList = (classJson?.Items || [])
      .filter((it) => !String(it.Name || "").includes("播放列表") && !String(it.Name || "").includes("相机"))
      .map((it) => ({ type_id: String(it.Id), type_name: it.Name }));

    const listUrl = `${config.host}/emby/Users/${config.userId}/Items?` +
      `SortBy=DateCreated&SortOrder=Descending&IncludeItemTypes=Movie,Series,Folder&` +
      `Recursive=true&Limit=40&Fields=${BASE_FIELDS},CommunityRating,CriticRating,Path,Overview,IsFolder&` +
      `EnableImageTypes=${IMAGE_TYPES}&ImageTypeLimit=1`;
    const listJson = await requestJson(listUrl, {}, config);

    return {
      class: classList,
      list: extractList(config, listJson),
    };
  } catch (e) {
    logError("首页请求失败", e);
    return { class: [], list: [] };
  }
}

async function category(params = {}) {
  const config = resolveConfig(params);
  const categoryId = params.categoryId || params.type_id || "";
  const pg = Math.max(1, toInt(params.page, 1));
  const startIndex = (pg - 1) * config.pageSize;

  logInfo("请求分类", { categoryId, page: pg });

  if (!config.host || !config.userId || !config.token) {
    logError("缺少必要配置", new Error("请配置 EMBY_HOST/EMBY_USER_ID/EMBY_TOKEN"));
    return { list: [], page: pg, pagecount: 0 };
  }

  try {
    const url = `${config.host}/emby/Users/${config.userId}/Items?` +
      `SortBy=DateLastContentAdded,SortName&SortOrder=Descending&` +
      `IncludeItemTypes=Movie,Series,Folder&Recursive=true&` +
      `Fields=${BASE_FIELDS},CommunityRating,CriticRating,Path,Overview,IsFolder&` +
      `StartIndex=${startIndex}&ParentId=${categoryId}&EnableImageTypes=${IMAGE_TYPES}&` +
      `ImageTypeLimit=1&Limit=${config.pageSize}&EnableUserData=true`;

    const data = await requestJson(url, {}, config);
    const list = extractList(config, data);

    return {
      list,
      page: pg,
      pagecount: list.length >= config.pageSize ? pg + 1 : pg,
    };
  } catch (e) {
    logError("分类请求失败", e);
    return { list: [], page: pg, pagecount: 0 };
  }
}

async function search(params = {}) {
  const config = resolveConfig(params);
  const wd = params.keyword || params.wd || "";
  const pg = Math.max(1, toInt(params.page, 1));
  const startIndex = (pg - 1) * config.pageSize;

  logInfo("搜索", { keyword: wd, page: pg });

  if (!config.host || !config.userId || !config.token) {
    logError("缺少必要配置", new Error("请配置 EMBY_HOST/EMBY_USER_ID/EMBY_TOKEN"));
    return { list: [], page: pg, pagecount: 0 };
  }

  try {
    const url = `${config.host}/emby/Users/${config.userId}/Items?` +
      `SortBy=SortName&SortOrder=Ascending&Fields=${BASE_FIELDS}&` +
      `StartIndex=${startIndex}&EnableImageTypes=${IMAGE_TYPES}&ImageTypeLimit=1&` +
      `Recursive=true&SearchTerm=${encodeURIComponent(wd)}&GroupProgramsBySeries=true&` +
      `Limit=${config.pageSize}`;

    const data = await requestJson(url, {}, config);
    const list = extractList(config, data);

    return {
      list,
      page: pg,
      pagecount: list.length >= config.pageSize ? pg + 1 : pg,
    };
  } catch (e) {
    logError("搜索失败", e);
    return { list: [], page: pg, pagecount: 0 };
  }
}

async function detail(params = {}) {
  const config = resolveConfig(params);
  const videoId = params.videoId || "";
  logInfo("请求详情", { videoId });

  if (!config.host || !config.userId || !config.token) {
    logError("缺少必要配置", new Error("请配置 EMBY_HOST/EMBY_USER_ID/EMBY_TOKEN"));
    return { list: [] };
  }

  try {
    const detailUrl = `${config.host}/emby/Users/${config.userId}/Items/${videoId}?` +
      `Fields=${BASE_FIELDS},CommunityRating,CriticRating,Path,Overview,People,Studios,RunTimeTicks,MediaStreams`;
    const info = await requestJson(detailUrl, {}, config);

    const people = info?.People || [];
    const director = people
      .filter((p) => p.Type === "Director" || (p.Role && p.Role.includes("Director")))
      .map((p) => p.Name)
      .join(" / ");

    const actor = people
      .filter((p) => p.Type === "Actor" || (p.Role && p.Role.includes("Actor")))
      .map((p) => p.Name)
      .join(" / ");

    const area = (info?.Studios || []).map((s) => s.Name).join(" / ");
    const language = Array.from(
      new Set(
        (info?.MediaStreams || [])
          .filter((s) => s.Type === "Audio" && s.Language)
          .map((s) => s.Language)
      )
    ).join(" / ");

    let duration = "";
    if (info?.RunTimeTicks) {
      const mins = Math.floor(info.RunTimeTicks / 600000000);
      const hours = Math.floor(mins / 60);
      duration = hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`;
    }

    const vod = {
      vod_id: String(videoId),
      vod_name: info?.Name || "",
      vod_pic: getImageUrl(config, info?.Id, info?.ImageTags?.Primary),
      vod_remarks: `评分：${info?.CommunityRating || "N/A"}`,
      vod_content: info?.Overview || "",
      vod_year: info?.ProductionYear ? String(info.ProductionYear) : "",
      vod_director: director,
      vod_actor: actor,
      vod_area: area,
      vod_lang: language,
      vod_time: duration,
      type_name: (info?.Genres || []).join(" "),
    };

    const playSources = [];

    if (info?.Type === "Series") {
      const seasonsUrl = `${config.host}/emby/Shows/${videoId}/Seasons?` +
        `UserId=${config.userId}&Fields=${BASE_FIELDS},Path,Overview&EnableTotalRecordCount=false`;
      const seasonsData = await requestJson(seasonsUrl, {}, config);
      const seasons = seasonsData?.Items || [];

      for (const season of seasons) {
        const episodesUrl = `${config.host}/emby/Shows/${videoId}/Episodes?` +
          `SeasonId=${season.Id}&ImageTypeLimit=1&UserId=${config.userId}&` +
          `Fields=Overview,PrimaryImageAspectRatio&Limit=1000`;
        const episodeData = await requestJson(episodesUrl, {}, config);
        const episodes = (episodeData?.Items || []).map((item) => {
          const episodeNum = item.IndexNumber ? `第${item.IndexNumber}集` : "未知集数";
          const fullName = item.Name ? `${episodeNum} ${item.Name}` : episodeNum;
          const playId = `${item.Id}|||${encodeMeta({ type: "item", name: fullName })}`;
          return { name: fullName, playId };
        });

        if (episodes.length > 0) {
          playSources.push({ name: season.Name || "默认线路", episodes });
        }
      }
    } else if (["Folder", "BoxSet", "CollectionFolder"].includes(info?.Type)) {
      const childrenUrl = `${config.host}/emby/Users/${config.userId}/Items?` +
        `ParentId=${videoId}&Recursive=false&IncludeItemTypes=Movie,Series,Video&` +
        `Fields=${BASE_FIELDS},Overview&SortBy=SortName&SortOrder=Ascending&Limit=200`;
      const childrenData = await requestJson(childrenUrl, {}, config);
      const episodes = (childrenData?.Items || []).map((item) => {
        const label = item.Type === "Series" ? `${item.Name} [系列]` : item.Name;
        const playId = `${item.Id}|||${encodeMeta({ type: item.Type === "Series" ? "series" : "item", name: label })}`;
        return { name: label, playId };
      });
      if (episodes.length > 0) {
        playSources.push({ name: "资源列表", episodes });
      }
    } else {
      const playId = `${videoId}|||${encodeMeta({ type: "item", name: info?.Name || "播放" })}`;
      playSources.push({ name: "EMBY", episodes: [{ name: info?.Name || "播放", playId }] });
    }

    vod.vod_play_sources = playSources;

    return { list: [vod] };
  } catch (e) {
    logError("详情获取失败", e);
    return { list: [] };
  }
}

async function play(params = {}) {
  const config = resolveConfig(params);
  const rawPlayId = params.playId || "";
  logInfo("准备播放", { playId: rawPlayId });

  if (!config.host || !config.userId || !config.token) {
    logError("缺少必要配置", new Error("请配置 EMBY_HOST/EMBY_USER_ID/EMBY_TOKEN"));
    return { urls: [], parse: 1 };
  }

  try {
    let playId = rawPlayId;
    let meta = {};
    if (rawPlayId.includes("|||")) {
      const parts = rawPlayId.split("|||");
      playId = parts[0];
      meta = decodeMeta(parts[1]);
    }

    let itemId = String(playId || "");
    if (meta?.type === "series") {
      const firstEpisodeId = await resolveFirstEpisodeId(config, itemId);
      if (!firstEpisodeId) {
        throw new Error("未找到可播放的剧集");
      }
      itemId = firstEpisodeId;
    }

    const playbackInfo = await fetchPlaybackInfo(config, itemId);
    const mediaSource = playbackInfo?.MediaSources?.[0];

    if (!mediaSource) {
      return {
        parse: 1,
        url: `${config.host}/emby/Items/${itemId}/PlaybackInfo`,
        header: getHeaders(config, { "Content-Type": "application/json" }),
        msg: "没有可用的媒体源",
      };
    }

    const playUrl = `${config.host}/emby/videos/${itemId}/stream?` +
      `Static=true&MediaSourceId=${mediaSource.Id}&DeviceId=${config.deviceId}&` +
      `api_key=${config.token}&PlaySessionId=${playbackInfo.PlaySessionId || ""}`;

    return {
      urls: [{ name: meta?.name || "默认线路", url: playUrl }],
      parse: 0,
      header: getHeaders(config),
    };
  } catch (e) {
    logError("解析播放地址失败", e);
    return { urls: [], parse: 1 };
  }
}

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);
