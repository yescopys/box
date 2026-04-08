// @name 玩偶聚合
// @author @lucky_TJQ
// @description 聚合玩偶、木偶、蜡笔、闪电、至臻、二小、虎斑、快映、欧哥、多多等网盘站点；支持刮削、弹幕、多线路、二级分类筛选、翻页、网盘排序
// @dependencies axios,cheerio
// @version 1.2.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/网盘/玩偶聚合.js

const OmniBox = require("omnibox_sdk");
const cheerio = require("cheerio");
const axios = require("axios");
const https = require("https");
const runner = require("spider_runner");

// 先导出再交给 runner
module.exports = { home, category, search, detail, play };
runner.run(module.exports);

// ==================== 配置区域 ====================
const FILTER_CONFIG_BASE_URL = "https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/%E9%85%8D%E7%BD%AE/%E7%AD%9B%E9%80%89";

// 网盘线路优先级（从高到低）
const LINE_ORDER = ["baidu", "a139", "a189", "a123", "a115", "quark", "xunlei", "ali", "uc"];

// 详情页播放线路显示排序（参考木偶，可由环境变量覆盖）
const DRIVE_ORDER = (process.env.DRIVE_ORDER || "baidu;a139;a189;a123;a115;quark;xunlei;ali;uc")
  .split(";")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// 播放线路名称（可由环境变量覆盖）
const SOURCE_NAMES_CONFIG = (process.env.SOURCE_NAMES_CONFIG || "本地代理;服务端代理;直连")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

// 多线路网盘类型（可由环境变量覆盖，仅这些类型生成多条播放线路）
const DRIVE_TYPE_CONFIG = (process.env.DRIVE_TYPE_CONFIG || "quark;uc")
  .split(";")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// 刮削开关（默认开启，设置环境变量 ENABLE_SCRAPE=0 关闭）
const ENABLE_SCRAPE = process.env.ENABLE_SCRAPE !== "0";

// 详情链路缓存时间（秒），默认 12 小时
const WANOU_CACHE_EX_SECONDS = Number(process.env.WANOU_CACHE_EX_SECONDS || 43200);

const PAGE_SIZE = 20;
const REQUEST_TIMEOUT = 15000;

// ==================== 站点域名配置 ====================
const WOGG_SITES = splitSites(process.env.WEB_SITE_WOGG || "https://wogg.xxooo.cf;https://wogg.333232.xyz;https://www.wogg.net;");
const MUOU_SITES = splitSites(process.env.WEB_SITE_MUOU || "https://www.muou.site;https://www.muou.asia;https://666.666291.xyz;");
const LABI_SITES = splitSites(process.env.WEB_SITE_LABI || "http://fmao.shop;");
const ZHIZHEN_SITES = splitSites(process.env.WEB_SITE_ZHIZHEN || "http://www.miqk.cc;https://www.mihdr.top;https://mihdr.top;");
const ERXIAO_SITES = splitSites(process.env.WEB_SITE_ERXIAO || "https://www.2xiaopan.top;https://www.erixaopan.fun;https://2xiaopan.top;https://www.wexwp.cc;");
const HUBAN_SITES = splitSites(process.env.WEB_SITE_HUBAN || "http://154.222.27.33:20720;http://xhban.xyz:20720;http://103.45.162.207:20720;");
const KUAIYING_SITES = splitSites(process.env.WEB_SITE_XIAOBAN || "http://154.201.83.50:12512;http://xsayang.fun:12512;");
const SHANDIAN_SITES = splitSites(process.env.WEB_SITE_SHANDIAN || "https://sd.sduc.site;");
const OUGE_SITES = splitSites(process.env.WEB_SITE_OUGE || "https://woog.nxog.eu.org;");
const DUODUO_SITES = splitSites(process.env.WEB_SITE_DUODUO || "https://tv.yydsys.top;https://tv.214521.xyz;https://tv.yydsys.cc;https://yydsys.de5.net;https://duo.hidns.vip;");

const SITES = [];

pushSiteIfAny({
  id: "wanou",
  name: "玩偶",
  filterFiles: ["wogg.json"],
  domains: WOGG_SITES,
  listSelector: ".module-item",
  detailPanSelector: ".module-row-info p",
  categoryUrl: "/vodshow/{categoryId}--------{page}---.html",
  categoryUrlWithFilters: "/vodshow/{categoryId}-{area}-{by}-{class}-----{page}---{year}.html",
  searchUrl: "/vodsearch/-------------.html?wd={keyword}&page={page}",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "音乐", "6": "短剧", "44": "臻彩", "46": "纪录片" },
});

pushSiteIfAny({
  id: "muou",
  name: "木偶",
  filterFiles: ["mogg.json"],
  domains: MUOU_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "纪录片", "25": "臻选", "29": "综艺", "30": "原盘" },
});

pushSiteIfAny({
  id: "labi",
  name: "蜡笔",
  filterFiles: ["labi.json"],
  domains: LABI_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "短剧", "24": "蜡笔4K", "29": "臻彩" },
});

pushSiteIfAny({
  id: "zhizhen",
  name: "至臻",
  filterFiles: ["zhizhen.json"],
  domains: ZHIZHEN_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "短剧", "24": "老剧", "44": "臻彩" },
});

pushSiteIfAny({
  id: "erxiao",
  name: "二小",
  filterFiles: ["erxiao.json"],
  domains: ERXIAO_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "臻彩", "21": "综艺" },
});

pushSiteIfAny({
  id: "huban",
  name: "虎斑",
  filterFiles: ["huban.json"],
  domains: HUBAN_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "综艺", "4": "动漫", "5": "短剧", "6": "臻彩", "30": "115网盘" },
});

pushSiteIfAny({
  id: "kuaiying",
  name: "快映",
  filterFiles: ["xiaoban.json"],
  domains: KUAIYING_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "综艺", "4": "动漫", "5": "臻彩", "6": "短剧", "30": "115", "35": "123", "36": "天移迅" },
});

pushSiteIfAny({
  id: "shandian",
  name: "闪电",
  filterFiles: ["shandian.json"],
  domains: SHANDIAN_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "综艺", "4": "动漫", "30": "短剧" },
});

pushSiteIfAny({
  id: "ouge",
  name: "欧哥",
  filterFiles: ["ouge.json"],
  domains: OUGE_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "短剧", "21": "综合" },
});

pushSiteIfAny({
  id: "duoduo",
  name: "多多",
  filterFiles: ["duoduo.json"],
  domains: DUODUO_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "多多电影", "2": "多多剧集", "3": "综艺", "4": "动漫", "5": "短剧", "20": "记录" },
});

if (SITES.length === 0) {
  throw new Error("至少需要一个站点配置，请检查环境变量配置");
}

for (const site of SITES) {
  OmniBox.log("info", `[init] 站点 ${site.name} 域名数=${site.domains.length}`);
}

const INSECURE_HTTPS_AGENT = new https.Agent({ rejectUnauthorized: false });

// ==================== 缓存 ====================
const driveParseCache = new Map();
const siteFilterCache = new Map();
const playHistoryDedupeCache = new Map();
const CACHE_TTL = { drive: 60 * 60 * 1000, filter: 6 * 60 * 1000 };

function buildCacheKey(prefix, value) {
  return `${prefix}:${value}`;
}

async function getCachedJSON(key) {
  try {
    return await OmniBox.getCache(key);
  } catch (error) {
    await OmniBox.log("warn", `[cache] 读取缓存失败: key=${key}, err=${error.message}`);
    return null;
  }
}

async function setCachedJSON(key, value, exSeconds) {
  try {
    await OmniBox.setCache(key, value, exSeconds);
  } catch (error) {
    await OmniBox.log("warn", `[cache] 写入缓存失败: key=${key}, err=${error.message}`);
  }
}

async function getDriveInfoCached(shareURL) {
  const cacheKey = buildCacheKey("wanou:driveInfo", shareURL);
  let driveInfo = await getCachedJSON(cacheKey);
  if (!driveInfo) {
    driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
    await setCachedJSON(cacheKey, driveInfo, WANOU_CACHE_EX_SECONDS);
  }
  return driveInfo;
}

async function getRootFileListCached(shareURL) {
  const cacheKey = buildCacheKey("wanou:rootFiles", shareURL);
  let fileList = await getCachedJSON(cacheKey);
  if (!fileList) {
    fileList = await OmniBox.getDriveFileList(shareURL, "0");
    if (Array.isArray(fileList?.files) && fileList.files.length > 0) {
      await setCachedJSON(cacheKey, fileList, WANOU_CACHE_EX_SECONDS);
    }
  }
  return fileList;
}

async function getAllVideoFilesCached(shareURL, rootFiles) {
  const cacheKey = buildCacheKey("wanou:videoFiles", shareURL);
  let allVideoFiles = await getCachedJSON(cacheKey);
  if (!Array.isArray(allVideoFiles) || allVideoFiles.length === 0) {
    allVideoFiles = await getAllVideoFiles(shareURL, rootFiles);
    if (Array.isArray(allVideoFiles) && allVideoFiles.length > 0) {
      await setCachedJSON(cacheKey, allVideoFiles, WANOU_CACHE_EX_SECONDS);
    }
  }
  return allVideoFiles;
}

function splitSites(raw) {
  return String(raw || "")
    .split(";")
    .map((url) => url.trim())
    .filter(Boolean);
}

function pushSiteIfAny(site) {
  if (Array.isArray(site.domains) && site.domains.length > 0) {
    SITES.push(site);
  }
}

// ==================== 网络请求 ====================
async function httpRequest(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const response = await axios({
    url,
    method,
    headers: {
      Accept: "*/*",
      ...(options.headers || {}),
    },
    data: options.body,
    timeout: options.timeout || REQUEST_TIMEOUT,
    httpsAgent: INSECURE_HTTPS_AGENT,
    validateStatus: () => true,
  });

  let body = response.data;
  if (typeof body !== "string") {
    body = body == null ? "" : JSON.stringify(body);
  }

  return {
    statusCode: response.status,
    body,
    headers: response.headers || {},
  };
}

function isBlockedHtml(body = "") {
  const lower = String(body || "").toLowerCase();
  return lower.includes("just a moment") || lower.includes("cf-browser-verification") || lower.includes("captcha") || lower.includes("访问验证");
}

function removeTrailingSlash(url) {
  return String(url || "").replace(/\/+$/, "");
}

async function requestWithFailover(domains, path, options = {}) {
  let lastError = null;
  const perDomainTimeout = Math.max(1000, Math.floor(30000 / Math.max(1, domains.length)));

  for (let i = 0; i < domains.length; i++) {
    const baseUrl = removeTrailingSlash(domains[i]);
    const fullUrl = path.startsWith("http") ? path : baseUrl + path;

    try {
      await OmniBox.log("info", `[request] try ${i + 1}/${domains.length} ${fullUrl}`);
      const response = await httpRequest(fullUrl, {
        ...options,
        method: options.method || "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          ...(options.headers || {}),
        },
        timeout: options.timeout ?? perDomainTimeout,
      });

      if (response.statusCode === 200 && response.body) {
        if (isBlockedHtml(response.body)) {
          await OmniBox.log("warn", `[request] blocked by ${baseUrl}`);
          lastError = new Error("命中风控页面");
          continue;
        }
        await OmniBox.log("info", `[request] success ${baseUrl}`);
        return { response, baseUrl };
      }

      await OmniBox.log("warn", `[request] non-200 ${response.statusCode} @ ${baseUrl}`);
      lastError = new Error(`HTTP ${response.statusCode}`);
    } catch (error) {
      await OmniBox.log("warn", `[request] fail ${baseUrl}: ${error.message}`);
      lastError = error;
    }
  }

  throw lastError || new Error("所有域名请求均失败");
}

// ==================== 通用辅助 ====================
function formatFileSize(size) {
  if (!size || size <= 0) return "";
  const unit = 1024;
  const units = ["B", "K", "M", "G", "T", "P"];
  if (size < unit) return `${size}B`;
  let exp = 0;
  let n = size;
  while (n >= unit && exp < units.length - 1) {
    n /= unit;
    exp++;
  }
  return Number.isInteger(n) ? `${n}${units[exp]}` : `${n.toFixed(2)}${units[exp]}`;
}

function isVideoFile(file) {
  if (!file || !file.file_name) return false;
  const fileName = String(file.file_name).toLowerCase();
  const exts = [".mp4", ".mkv", ".avi", ".flv", ".mov", ".wmv", ".m3u8", ".ts", ".webm", ".m4v"];
  if (exts.some((ext) => fileName.endsWith(ext))) return true;
  const formatType = String(file.format_type || "").toLowerCase();
  return formatType.includes("video") || formatType.includes("mpeg") || formatType.includes("h264");
}

async function getAllVideoFiles(shareURL, files, errors = []) {
  if (!Array.isArray(files)) return [];
  const tasks = files.map(async (file) => {
    if (file.file && isVideoFile(file)) return [file];
    if (file.dir) {
      try {
        const subFileList = await OmniBox.getDriveFileList(shareURL, file.fid);
        if (Array.isArray(subFileList?.files)) {
          return await getAllVideoFiles(shareURL, subFileList.files, errors);
        }
      } catch (error) {
        errors.push({ path: file.name || file.fid, fid: file.fid, message: error.message, timestamp: new Date().toISOString() });
      }
    }
    return [];
  });
  const results = await Promise.all(tasks);
  return results.flat();
}

// ==================== 筛选器 ====================
function normalizeFilterOption(option) {
  if (!option || typeof option !== "object") return null;
  const name = option.n ?? option.name;
  const value = option.v ?? option.value;
  if (name === undefined || value === undefined) return null;
  return { name: String(name), value: String(value) };
}

function normalizeFilterGroup(group) {
  if (!group || typeof group !== "object" || !group.key) return null;
  const rawValues = Array.isArray(group.value) ? group.value : [];
  const values = rawValues.map(normalizeFilterOption).filter(Boolean);
  if (values.length === 0) return null;
  return {
    key: String(group.key),
    name: String(group.name || group.key),
    init: group.init !== undefined ? String(group.init) : "",
    value: values,
  };
}

function normalizeFilterConfigByCategory(config) {
  if (!config || typeof config !== "object") return null;
  const normalized = {};
  for (const [categoryId, groups] of Object.entries(config)) {
    if (!Array.isArray(groups)) continue;
    const normalizedGroups = groups.map(normalizeFilterGroup).filter(Boolean);
    if (normalizedGroups.length > 0) normalized[categoryId] = normalizedGroups;
  }
  return Object.keys(normalized).length > 0 ? normalized : null;
}

function mergeFilterGroups(groups) {
  const mergedMap = new Map();
  for (const group of groups) {
    const normalized = normalizeFilterGroup(group);
    if (!normalized || normalized.key === "categoryId") continue;
    if (!mergedMap.has(normalized.key)) {
      mergedMap.set(normalized.key, { key: normalized.key, name: normalized.name, init: normalized.init, valueMap: new Map() });
    }
    const bucket = mergedMap.get(normalized.key);
    for (const item of normalized.value) {
      if (!bucket.valueMap.has(item.value)) {
        bucket.valueMap.set(item.value, item.name);
      }
    }
  }

  return Array.from(mergedMap.values()).map((group) => {
    const values = Array.from(group.valueMap.entries()).map(([value, name]) => ({ name, value }));
    if (!values.some((item) => item.value === "") && values.length > 0) {
      values.unshift({ name: "全部", value: "" });
    }
    return {
      key: group.key,
      name: group.name,
      init: group.init || (values[0]?.value ?? ""),
      value: values,
    };
  });
}

function buildCategoryFilterGroup(site) {
  const categories = Object.entries(site.defaultCategories || {});
  return {
    key: "categoryId",
    name: "分类",
    init: categories[0]?.[0] || "",
    value: [{ name: "全部", value: "" }, ...categories.map(([id, name]) => ({ name, value: id }))],
  };
}

function buildSiteFilters(site, externalFilterConfig) {
  const categoryFilter = buildCategoryFilterGroup(site);
  if (!externalFilterConfig || typeof externalFilterConfig !== "object" || Object.keys(externalFilterConfig).length === 0) {
    return [categoryFilter];
  }
  const allGroups = [];
  for (const groups of Object.values(externalFilterConfig)) {
    if (Array.isArray(groups)) allGroups.push(...groups);
  }
  return [categoryFilter, ...mergeFilterGroups(allGroups)];
}

async function fetchExternalFilterConfig(site) {
  const cache = siteFilterCache.get(site.id);
  if (cache && Date.now() - cache.time < CACHE_TTL.filter) return cache.data;

  const files = Array.isArray(site.filterFiles) ? site.filterFiles : [];
  if (files.length === 0) {
    siteFilterCache.set(site.id, { data: null, time: Date.now() });
    return null;
  }

  for (const file of files) {
    const url = `${FILTER_CONFIG_BASE_URL}/${file}`;
    try {
      const response = await httpRequest(url, { timeout: 10000 });
      if (response.statusCode !== 200 || !response.body) continue;
      const parsed = JSON.parse(response.body);
      const normalizedConfig = normalizeFilterConfigByCategory(parsed);
      siteFilterCache.set(site.id, { data: normalizedConfig, time: Date.now() });
      await OmniBox.log("info", `[filter] ${site.name} loaded ${file}`);
      return normalizedConfig;
    } catch (error) {
      await OmniBox.log("warn", `[filter] ${site.name} load fail ${file}: ${error.message}`);
    }
  }

  siteFilterCache.set(site.id, { data: null, time: Date.now() });
  return null;
}

function encodeFilterSegment(value) {
  return encodeURIComponent(String(value ?? "").trim());
}

function hasSecondaryFilters(filters = {}) {
  return Object.keys(filters).some((key) => key !== "categoryId" && filters[key] !== undefined && filters[key] !== null && filters[key] !== "");
}

function buildCategoryUrl(site, categoryId, page = 1, filters = {}) {
  const safeFilters = filters || {};
  const byValue = safeFilters.by || safeFilters.sort || "";

  if (site.categoryUrlWithFilters) {
    let url = site.categoryUrlWithFilters;
    const replacements = {
      categoryId: categoryId || "",
      page: page || 1,
      class: encodeFilterSegment(safeFilters.class),
      area: encodeFilterSegment(safeFilters.area),
      year: encodeFilterSegment(safeFilters.year),
      by: encodeFilterSegment(byValue),
      letter: encodeFilterSegment(safeFilters.letter),
    };
    for (const [key, value] of Object.entries(replacements)) {
      url = url.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
    }
    return url;
  }

  if (site.categoryUrl) {
    return site.categoryUrl.replace("{categoryId}", categoryId).replace("{page}", page);
  }

  if (hasSecondaryFilters(safeFilters)) {
    const segments = [];
    for (const [key, rawValue] of Object.entries(safeFilters)) {
      if (key === "categoryId" || rawValue == null || rawValue === "") continue;
      const mappedKey = key === "sort" ? "by" : key;
      segments.push(`/${mappedKey}/${encodeFilterSegment(rawValue)}`);
    }
    return `/index.php/vod/show/id/${categoryId}${segments.join("")}/page/${page}.html`;
  }

  return `/index.php/vod/show/id/${categoryId}/page/${page}.html`;
}

function parseTotalPages($) {
  let totalPages = 1;
  const pageSelectors = [".page-numbers:not(.next):not(.prev)", ".pagination a", ".page a", ".pages a", ".module-page a"];
  for (const selector of pageSelectors) {
    const pageLinks = $(selector);
    if (pageLinks.length > 0) {
      let maxPage = 1;
      pageLinks.each((_, el) => {
        const pageNum = parseInt($(el).text().trim(), 10);
        if (!Number.isNaN(pageNum) && pageNum > maxPage) maxPage = pageNum;
      });
      if (maxPage > 1) {
        totalPages = maxPage;
        break;
      }
    }
  }
  const pageText = $(".page-text, .page_info, .page-count").text();
  const pageMatch = pageText.match(/共\s*(\d+)\s*页/);
  if (pageMatch) totalPages = parseInt(pageMatch[1], 10) || 1;
  return totalPages;
}

// ==================== 网盘解析 ====================
async function getDriveParseWithCache(url, driveKey, drives, source = "") {
  const cacheKey = `${driveKey}_${url}`;
  const cached = driveParseCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL.drive) {
    return { data: cached.data, fromCache: true };
  }

  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("驱动超时")), 8000));
  try {
    const result = await Promise.race([getEpisodesFromDrive(url, driveKey, drives, source), timeoutPromise]);
    driveParseCache.set(cacheKey, { data: result, time: Date.now() });
    return { data: result, fromCache: false };
  } catch (error) {
    await OmniBox.log("info", `[drive] parse fail ${driveKey}, source=${source}, err=${error.message}`);
    return { data: null, fromCache: false, error: error.message };
  }
}

async function getEpisodesFromDrive(url, driveKey, drives, source = "") {
  const drive = drives.find((d) => d.key === driveKey);
  if (!drive) {
    await OmniBox.log("info", `[drive] missing driver ${driveKey}`);
    return null;
  }

  try {
    if (!drive.matchShare || !drive.matchShare(url)) {
      await OmniBox.log("info", `[drive] unmatched share ${driveKey}`);
      return null;
    }
    const vod = await drive.getVod(url);
    if (!vod) return null;

    let isValid = true;
    if (vod.vod_play_url) {
      const parts = vod.vod_play_url.split("#");
      if (parts.length === 1) {
        const [name] = parts[0].split("$");
        if (["播放", "全集", "点击播放", "立即播放"].includes(name)) isValid = false;
      }
    } else {
      isValid = false;
    }

    if (!isValid) return null;

    return {
      playFrom: vod.vod_play_from || driveKey,
      playUrl: vod.vod_play_url,
      vodPic: vod.vod_pic || "",
      vodContent: vod.vod_content || "",
      vodActor: vod.vod_actor || "",
      vodDirector: vod.vod_director || "",
    };
  } catch (error) {
    await OmniBox.log("info", `[drive] error ${driveKey}: ${error.message}`);
    return null;
  }
}

// ==================== 站点抓取 ====================
async function fetchSiteSearch(site, keyword, page = 1) {
  const searchUrl = site.searchUrl
    ? site.searchUrl.replace("{keyword}", encodeURIComponent(keyword)).replace("{page}", page)
    : `/index.php/vod/search/page/${page}/wd/${encodeURIComponent(keyword)}.html`;

  try {
    const { response, baseUrl } = await requestWithFailover(site.domains, searchUrl);
    const $ = cheerio.load(response.body);
    const itemSelector = site.searchListSelector || ".module-search-item";
    const items = $(itemSelector);
    const videos = [];

    items.each((_, el) => {
      const $item = $(el);
      const href = $item.find(".video-serial").attr("href") || $item.find(".module-item-pic a").attr("href") || $item.find(".module-item-title").attr("href");
      const vodName = $item.find(".video-serial").attr("title") || $item.find(".module-item-pic img").attr("alt") || $item.find(".module-item-title").attr("title") || $item.find(".module-item-title").text().trim();
      let vodPic = $item.find(".module-item-pic img").attr("data-src") || $item.find(".module-item-pic img").attr("src");
      if (vodPic && !vodPic.startsWith("http")) vodPic = baseUrl + vodPic;
      const vodRemarks = $item.find(".module-item-text").text().trim();
      const vodYear = $item.find(".module-item-caption span").first().text().trim();

      if (href && vodName) {
        videos.push({
          vod_id: `${site.id}_${href}`,
          vod_name: `[${site.name}] ${vodName}`,
          vod_pic: vodPic || "",
          type_id: "",
          type_name: "",
          vod_remarks: vodRemarks || "",
          vod_year: vodYear || "",
          _source: site.name,
          _original_name: vodName,
        });
      }
    });

    await OmniBox.log("info", `[search] site=${site.name}, page=${page}, hit=${videos.length}`);
    return videos;
  } catch (error) {
    await OmniBox.log("error", `[search] site=${site.name} fail: ${error.message}`);
    return [];
  }
}

async function fetchSiteCategoryList(site, categoryId, page = 1, filters = {}) {
  const url = buildCategoryUrl(site, categoryId, page, filters);
  await OmniBox.log("info", `[category] site=${site.name}, cid=${categoryId}, page=${page}, url=${url}`);

  const { response, baseUrl } = await requestWithFailover(site.domains, url);
  const $ = cheerio.load(response.body);
  const videos = [];

  $(site.listSelector).each((_, el) => {
    const $item = $(el);
    const href = $item.find(".module-item-pic a").attr("href") || $item.find(".module-item-title").attr("href");
    const vodName = $item.find(".module-item-pic img").attr("alt") || $item.find(".module-item-title").attr("title") || $item.find(".module-item-title").text().trim();
    let vodPic = $item.find(".module-item-pic img").attr("data-src") || $item.find(".module-item-pic img").attr("src");
    if (vodPic && !vodPic.startsWith("http")) vodPic = baseUrl + vodPic;
    const vodRemarks = $item.find(".module-item-text").text().trim();
    const vodYear = $item.find(".module-item-caption span").first().text().trim();

    if (href && vodName) {
      videos.push({
        vod_id: `${site.id}_${href}`,
        vod_name: vodName,
        vod_pic: vodPic || "",
        type_id: categoryId,
        type_name: site.defaultCategories[categoryId] || "",
        vod_remarks: vodRemarks || "",
        vod_year: vodYear || "",
      });
    }
  });

  const totalPages = parseTotalPages($);
  const total = videos.length > 0 ? videos.length * totalPages : 0;
  await OmniBox.log("info", `[category] site=${site.name}, list=${videos.length}, pages=${totalPages}`);
  return { list: videos, total, page, totalPages };
}

async function fetchSiteDetail(site, videoId) {
  const { response, baseUrl } = await requestWithFailover(site.domains, videoId);
  const $ = cheerio.load(response.body);

  let vodName = $(".page-title").text().trim() || "";
  let vodPic = $(".mobile-play .lazyload").attr("data-src") || "";
  if (vodPic && !vodPic.startsWith("http")) vodPic = baseUrl + vodPic;

  let vodYear = "";
  let vodDirector = "";
  let vodActor = "";
  let vodContent = "";

  $(".video-info-itemtitle").each((_, item) => {
    const key = $(item).text();
    const value = $(item).next().find("a").map((_, a) => $(a).text().trim()).get().filter(Boolean).join(", ");
    if (key.includes("剧情")) vodContent = $(item).next().find("p").text().trim();
    else if (key.includes("导演")) vodDirector = value;
    else if (key.includes("主演")) vodActor = value;
  });

  const panUrls = [];
  $(site.detailPanSelector).each((_, p) => {
    const url = $(p).text().trim();
    if (url && url.startsWith("http")) panUrls.push(url);
  });

  await OmniBox.log("info", `[detail] site=${site.name}, panUrls=${panUrls.length}`);
  return { vodName, vodPic, vodYear, vodDirector, vodActor, vodContent, panUrls };
}

async function handleSiteDetail(vodId, drives, context) {
  const parts = String(vodId).split("_");
  const siteId = parts[0];
  const rawId = parts.slice(1).join("_");
  const site = SITES.find((s) => s.id === siteId);
  if (!site) return null;

  const { vodName, vodPic, vodYear, vodDirector, vodActor, vodContent, panUrls } = await fetchSiteDetail(site, rawId);

  const panItems = panUrls.map((panUrl) => ({ url: panUrl, driveKey: detectDriveKey(panUrl) }));
  panItems.sort((a, b) => compareDriveKeyOrder(a.driveKey, b.driveKey));

  let playSources = [];
  const driveTypeCountMap = {};
  for (const { url: shareURL } of panItems) {
    const driveInfo = await getDriveInfoCached(shareURL);
    const displayName = driveInfo.displayName || "未知网盘";
    driveTypeCountMap[displayName] = (driveTypeCountMap[displayName] || 0) + 1;
  }

  const driveTypeCurrentIndexMap = {};

  // ==================== 限并发处理网盘链接 ====================
  const detailConcurrency = 4;
  const panUrlResults = await runWithConcurrency(panItems.map(item => item.url), detailConcurrency, async (shareURL) => {
    try {
      await OmniBox.log("info", `[detail] 处理网盘链接: ${shareURL}`);

      const driveInfo = await getDriveInfoCached(shareURL);
      let displayName = driveInfo.displayName || "未知网盘";
      const totalCount = driveTypeCountMap[displayName] || 0;
      if (totalCount > 1) {
        driveTypeCurrentIndexMap[displayName] = (driveTypeCurrentIndexMap[displayName] || 0) + 1;
        displayName = `${displayName}${driveTypeCurrentIndexMap[displayName]}`;
      }

      await OmniBox.log("info", `[detail] 网盘类型: ${displayName}, driveType: ${driveInfo.driveType}`);

      const fileList = await getRootFileListCached(shareURL);
      if (!Array.isArray(fileList?.files) || fileList.files.length === 0) {
        await OmniBox.log("warn", `[detail] 获取文件列表失败: ${shareURL}`);
        return null;
      }

      await OmniBox.log("info", `[detail] 从分享链接 ${shareURL} 获取文件列表成功,文件数量: ${fileList.files.length}`);

      const allVideoFiles = await getAllVideoFilesCached(shareURL, fileList.files);
      if (allVideoFiles.length === 0) {
        await OmniBox.log("warn", `[detail] 未找到视频文件: ${shareURL}`);
        return null;
      }

      await OmniBox.log("info", `[detail] 递归获取视频文件完成,视频文件数量: ${allVideoFiles.length}`);

      // ==================== 刮削处理（参考木偶.js）====================
      const scrapeKey = `${vodId}@@${encodeURIComponent(shareURL)}`;
      if (ENABLE_SCRAPE) {
        try {
          await OmniBox.log("info", `[detail] 开始执行刮削处理, scrapeKey=${scrapeKey}, 资源名: ${vodName}, 视频文件数: ${allVideoFiles.length}`);

          const videoFilesForScraping = allVideoFiles.map((file) => {
            const fileId = file.fid || file.file_id || "";
            const formattedFileId = fileId ? `${shareURL}|${fileId}|${scrapeKey}` : fileId;
            return {
              ...file,
              fid: formattedFileId,
              file_id: formattedFileId,
            };
          });

          await OmniBox.log("info", `[detail] 文件ID格式转换完成,示例: ${videoFilesForScraping[0]?.fid || "N/A"}`);

          const scrapingResult = await OmniBox.processScraping(scrapeKey, vodName, vodName, videoFilesForScraping);
          await OmniBox.log("info", `[detail] 刮削处理完成,结果: ${JSON.stringify(scrapingResult).substring(0, 200)}`);
        } catch (error) {
          await OmniBox.log("error", `[detail] 刮削处理失败: ${error.message}`);
          if (error.stack) {
            await OmniBox.log("error", `[detail] 刮削错误堆栈: ${error.stack}`);
          }
        }
      }

      // 获取刮削后的元数据（使用独立 scrapeKey，避免多个网盘互相覆盖）
      let scrapeData = null;
      let videoMappings = [];
      let scrapeType = "";

      try {
        await OmniBox.log("info", `[detail] 开始获取元数据, scrapeKey: ${scrapeKey}`);
        const metadata = await OmniBox.getScrapeMetadata(scrapeKey);
        await OmniBox.log("info", `[detail] 获取元数据响应: ${JSON.stringify(metadata).substring(0, 500)}`);

        scrapeData = metadata.scrapeData || null;
        videoMappings = metadata.videoMappings || [];
        scrapeType = metadata.scrapeType || "";

        if (scrapeData) {
          await OmniBox.log("info", `[detail] 获取到刮削数据,标题: ${scrapeData.title || "未知"}, 类型: ${scrapeType || "未知"}, 映射数量: ${videoMappings.length}`);
        } else {
          await OmniBox.log("warn", `[detail] 未获取到刮削数据,映射数量: ${videoMappings.length}`);
        }
      } catch (error) {
        await OmniBox.log("error", `[detail] 获取元数据失败: ${error.message}`);
        if (error.stack) {
          await OmniBox.log("error", `[detail] 获取元数据错误堆栈: ${error.stack}`);
        }
      }

      return { shareURL, displayName, driveInfo, allVideoFiles, scrapeData, videoMappings, scrapeType, scrapeKey };
    } catch (error) {
      await OmniBox.log("error", `[detail] 处理网盘链接失败: ${shareURL}, 错误: ${error.message}`);
      return null;
    }
  });

  let updatedVodName = vodName;
  let updatedVodPic = vodPic;
  let updatedVodYear = vodYear;
  let updatedVodActor = vodActor;
  let updatedVodDirector = vodDirector;
  let updatedVodContent = vodContent;

  const from = context?.from || "web";
  let effectiveSourceNamesConfig = [...SOURCE_NAMES_CONFIG];
  if (from === "web") {
    effectiveSourceNamesConfig = effectiveSourceNamesConfig.filter((name) => name !== "本地代理");
  }

  for (const result of panUrlResults) {
    if (!result) continue;
    const { shareURL, displayName, driveInfo, allVideoFiles, scrapeData, videoMappings, scrapeType, scrapeKey } = result;

    let sourceNames = [displayName];
    if (DRIVE_TYPE_CONFIG.includes(driveInfo.driveType)) {
      sourceNames = [...effectiveSourceNamesConfig];
      OmniBox.log("info", `${displayName} 匹配成功,线路设置为: ${sourceNames.join(", ")}`);
    }

    for (const sourceName of sourceNames) {
      const episodes = [];
      for (const file of allVideoFiles) {
        let fileName = file.file_name || "";
        const fileId = file.fid || "";
        const fileSize = file.size || file.file_size || 0;
        if (!fileName || !fileId) continue;

        const formattedFileId = `${shareURL}|${fileId}|${scrapeKey}`;
        let matchedMapping = null;

        if (scrapeData && Array.isArray(videoMappings) && videoMappings.length) {
          for (const mapping of videoMappings) {
            if (mapping && mapping.fileId === formattedFileId) {
              matchedMapping = mapping;
              const newFileName = buildScrapedFileName(scrapeData, mapping, fileName);
              if (newFileName && newFileName !== fileName) {
                fileName = newFileName;
                await OmniBox.log("info", `[detail] 应用刮削文件名: ${file.file_name} -> ${fileName}`);
              }
              break;
            }
          }
        }

        let displayFileName = fileName;
        if (fileSize > 0) {
          const sizeStr = formatFileSize(fileSize);
          if (sizeStr) displayFileName = `[${sizeStr}] ${fileName}`;
        }

        const encodedDanmakuName = encodeURIComponent(fileName);
        const episode = { name: displayFileName, playId: `${formattedFileId}|${encodedDanmakuName}` };
        if (fileSize > 0) episode.size = fileSize;
        if (matchedMapping) {
          if (matchedMapping.seasonNumber !== undefined) episode._seasonNumber = matchedMapping.seasonNumber;
          if (matchedMapping.episodeNumber !== undefined) episode._episodeNumber = matchedMapping.episodeNumber;
          if (matchedMapping.episodeName) episode.episodeName = matchedMapping.episodeName;
          if (matchedMapping.episodeOverview) episode.episodeOverview = matchedMapping.episodeOverview;
          if (matchedMapping.episodeAirDate) episode.episodeAirDate = matchedMapping.episodeAirDate;
          if (matchedMapping.episodeStillPath) episode.episodeStillPath = matchedMapping.episodeStillPath;
          if (matchedMapping.episodeVoteAverage !== undefined) episode._episodeVoteAverage = matchedMapping.episodeVoteAverage;
          if (matchedMapping.episodeRuntime !== undefined) episode._episodeRuntime = matchedMapping.episodeRuntime;
        }
        episodes.push(episode);
      }

      if (scrapeData && episodes.some((ep) => ep._episodeNumber !== undefined)) {
        await OmniBox.log("info", `[detail] 检测到刮削数据,按 episodeNumber 排序剧集列表,共 ${episodes.length} 集`);
        episodes.sort((a, b) => {
          const seasonA = a._seasonNumber ?? 0;
          const seasonB = b._seasonNumber ?? 0;
          if (seasonA !== seasonB) return seasonA - seasonB;
          return (a._episodeNumber ?? 0) - (b._episodeNumber ?? 0);
        });
      }

      if (episodes.length > 0) {
        let finalSourceName = sourceName;
        if (DRIVE_TYPE_CONFIG.includes(driveInfo.driveType)) {
          finalSourceName = `${displayName}-${sourceName}`;
        }
        playSources.push({ name: finalSourceName, episodes });
      }
    }

    if (scrapeData) {
      if (scrapeData.title) updatedVodName = scrapeData.title;
      if (scrapeData.posterPath) updatedVodPic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
      if (scrapeData.releaseDate) updatedVodYear = scrapeData.releaseDate.substring(0, 4);
      if (scrapeData.overview) updatedVodContent = scrapeData.overview;
      if (scrapeData.credits) {
        if (Array.isArray(scrapeData.credits.cast) && scrapeData.credits.cast.length) {
          updatedVodActor = scrapeData.credits.cast.slice(0, 5).map((c) => c.name).filter(Boolean).join(",");
        }
        if (Array.isArray(scrapeData.credits.crew) && scrapeData.credits.crew.length) {
          const directors = scrapeData.credits.crew.filter((c) => c.job === "Director" || c.department === "Directing");
          if (directors.length) updatedVodDirector = directors.slice(0, 3).map((d) => d.name).filter(Boolean).join(",");
        }
      }
    }
  }

  // 按网盘类型优先级排序播放源
  if (Array.isArray(playSources) && playSources.length > 1 && DRIVE_ORDER.length > 0) {
    const sortedSources = sortPlaySourcesByDriveOrder(playSources);
    await OmniBox.log("info", `[detail] 按 DRIVE_ORDER 排序后线路顺序: ${sortedSources.map(item => item.name).join(' | ')}`);
    playSources = sortedSources;
  }

  await OmniBox.log("info", `[detail] 构建播放源完成,网盘数量: ${playSources.length}`);

  return {
    vod_id: vodId,
    vod_name: updatedVodName,
    vod_pic: updatedVodPic,
    vod_year: updatedVodYear,
    vod_director: updatedVodDirector,
    vod_actor: updatedVodActor,
    vod_content: updatedVodContent || `网盘资源,共${panUrls.length}个网盘链接`,
    vod_play_sources: playSources.length > 0 ? playSources : undefined,
  };
}

function detectDriveKey(panUrl) {
  const url = String(panUrl || "");
  if (url.includes("pan.baidu.com")) return "baidu";
  if (url.includes("quark.cn")) return "quark";
  if (url.includes("115.com")) return "a115";
  if (url.includes("123pan.com")) return "a123";
  if (url.includes("189.cn")) return "a189";
  if (url.includes("139.com")) return "a139";
  if (url.includes("aliyundrive.com")) return "ali";
  if (url.includes("xunlei.com")) return "xunlei";
  if (url.includes("uc.cn")) return "uc";
  return "other";
}

function inferDriveTypeFromSourceName(name = "") {
  const raw = String(name || "").toLowerCase();
  if (raw.includes("百度")) return "baidu";
  if (raw.includes("139")) return "a139";
  if (raw.includes("天翼") || raw.includes("189")) return "a189";
  if (raw.includes("123")) return "a123";
  if (raw.includes("115")) return "a115";
  if (raw.includes("夸克")) return "quark";
  if (raw.includes("迅雷")) return "xunlei";
  if (raw.includes("阿里")) return "ali";
  if (raw === "uc" || raw.includes("uc")) return "uc";
  return raw;
}

function sortPlaySourcesByDriveOrder(playSources = []) {
  if (!Array.isArray(playSources) || playSources.length <= 1 || DRIVE_ORDER.length === 0) {
    return playSources;
  }
  const orderMap = new Map(DRIVE_ORDER.map((name, index) => [name, index]));
  return [...playSources].sort((a, b) => {
    const aType = inferDriveTypeFromSourceName(a?.name || "");
    const bType = inferDriveTypeFromSourceName(b?.name || "");
    const aOrder = orderMap.has(aType) ? orderMap.get(aType) : Number.MAX_SAFE_INTEGER;
    const bOrder = orderMap.has(bType) ? orderMap.get(bType) : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return 0;
  });
}

function compareDriveKeyOrder(a, b) {
  const indexA = LINE_ORDER.indexOf(a);
  const indexB = LINE_ORDER.indexOf(b);
  if (indexA === -1 && indexB === -1) return 0;
  if (indexA === -1) return 1;
  if (indexB === -1) return -1;
  return indexA - indexB;
}

/**
 * 工具: 限并发执行任务，避免 detail 中网盘链接过多时瞬时并发过高。
 */
async function runWithConcurrency(items, limit, taskFn) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return [];

  const results = new Array(list.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= list.length) break;
      results[current] = await taskFn(list[current], current);
    }
  }

  const workerCount = Math.max(1, Math.min(limit || 1, list.length));
  const workers = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

/**
 * 构建刮削后的文件名（参考木偶.js）
 */
function buildScrapedFileName(scrapeData, mapping, originalFileName) {
  if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
    return originalFileName;
  }

  if (scrapeData && scrapeData.episodes && Array.isArray(scrapeData.episodes)) {
    for (const episode of scrapeData.episodes) {
      if (episode.episodeNumber === mapping.episodeNumber && episode.seasonNumber === mapping.seasonNumber) {
        if (episode.name) {
          return `${episode.episodeNumber}.${episode.name}`;
        }
        break;
      }
    }
  }

  return originalFileName;
}

function buildDanmakuCandidates({ scrapeData, scrapeType = "", matchedMapping = null, fallbackDanmakuFileName = "" }) {
  const candidates = [];
  const seen = new Set();

  const pushCandidate = (value) => {
    const text = String(value || "").trim();
    if (!text) return;
    if (seen.has(text)) return;
    seen.add(text);
    candidates.push(text);
  };

  if (scrapeData) {
    if (scrapeType === "movie") {
      pushCandidate(scrapeData.title || "");
      if (scrapeData.title && scrapeData.releaseDate) {
        pushCandidate(`${scrapeData.title}.${String(scrapeData.releaseDate).slice(0, 4)}`);
      }
    } else if (matchedMapping) {
      const title = scrapeData.title || "";
      const seasonAirYear = scrapeData.seasonAirYear || "";
      const seasonNumber = matchedMapping.seasonNumber || 1;
      const episodeNum = matchedMapping.episodeNumber || 1;
      pushCandidate(`${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`);
      pushCandidate(`${title}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`);
      if (matchedMapping.episodeName) {
        pushCandidate(`${title}.${matchedMapping.episodeName}`);
      }
    }
  }

  if (fallbackDanmakuFileName) {
    pushCandidate(decodeURIComponent(fallbackDanmakuFileName));
  }

  return candidates;
}

async function matchDanmakuByCandidates(candidates = []) {
  for (const fileName of candidates) {
    try {
      const danmakuList = await OmniBox.getDanmakuByFileName(fileName);
      if (Array.isArray(danmakuList) && danmakuList.length > 0) {
        await OmniBox.log("info", `[danmaku] matched ${fileName}, count=${danmakuList.length}`);
        return danmakuList;
      }
    } catch (error) {
      await OmniBox.log("warn", `[danmaku] candidate fail ${fileName}: ${error.message}`);
    }
  }
  return [];
}

// ==================== OmniBox handlers ====================
async function home(params, context) {
  try {
    await OmniBox.log("info", `[home] start, sites=${SITES.length}`);

    const classList = SITES.map((site) => ({ type_id: `site_${site.id}`, type_name: site.name }));

    const filters = {};
    const filterResults = await Promise.all(
      SITES.map(async (site) => ({ siteId: site.id, filters: buildSiteFilters(site, await fetchExternalFilterConfig(site)) }))
    );
    for (const item of filterResults) {
      filters[`site_${item.siteId}`] = item.filters;
    }

    const recommendResults = await Promise.all(
      SITES.slice(0, 3).map(async (site) => {
        try {
          const firstCategory = Object.keys(site.defaultCategories)[0] || "1";
          const result = await fetchSiteCategoryList(site, firstCategory, 1);
          return result.list.slice(0, 4);
        } catch (error) {
          await OmniBox.log("warn", `[home] recommend fail ${site.name}: ${error.message}`);
          return [];
        }
      })
    );

    const recommendList = recommendResults.flat().slice(0, 12);
    await OmniBox.log("info", `[home] class=${classList.length}, recommend=${recommendList.length}`);
    return { class: classList, list: recommendList, filters };
  } catch (error) {
    await OmniBox.log("error", `[home] ${error.message}`);
    return { class: [], list: [], filters: {} };
  }
}

async function category(params, context) {
  try {
    const typeId = params.categoryId || "";
    const page = parseInt(params.page || "1", 10);
    const filters = params.filters || {};
    await OmniBox.log("info", `[category] typeId=${typeId}, page=${page}, filters=${JSON.stringify(filters)}`);

    if (!typeId.startsWith("site_")) {
      return { list: [], page: 1, pagecount: 0, total: 0 };
    }

    const siteId = typeId.replace("site_", "");
    const site = SITES.find((s) => s.id === siteId);
    if (!site) {
      return { list: [], page: 1, pagecount: 0, total: 0 };
    }

    const externalFilterConfig = await fetchExternalFilterConfig(site);
    const siteFilters = buildSiteFilters(site, externalFilterConfig);

    let categoryId = filters.categoryId || "";
    const categories = Object.keys(site.defaultCategories);
    if (!categoryId && categories.length > 0) {
      categoryId = categories[0];
      await OmniBox.log("info", `[category] default categoryId=${categoryId}`);
    }
    if (!categoryId) {
      return { list: [], page: 1, pagecount: 0, total: 0, filters: siteFilters };
    }

    const categoryFilters = { ...filters };
    delete categoryFilters.categoryId;
    const result = await fetchSiteCategoryList(site, categoryId, page, categoryFilters);
    const pagecount = result.totalPages || Math.ceil(result.total / PAGE_SIZE) || 1;
    await OmniBox.log("info", `[category] return page=${page}, pagecount=${pagecount}, total=${result.total}`);
    return { list: result.list, page, pagecount, total: result.total, filters: siteFilters };
  } catch (error) {
    await OmniBox.log("error", `[category] ${error.message}`);
    return { list: [], page: 1, pagecount: 0, total: 0 };
  }
}

async function detail(params, context) {
  try {
    const videoId = params.videoId || "";
    const drives = context?.drives || [];
    await OmniBox.log("info", `[detail] videoId=${videoId}`);
    if (!videoId) return { list: [] };
    const data = await handleSiteDetail(videoId, drives, context);
    return { list: data ? [data] : [] };
  } catch (error) {
    await OmniBox.log("error", `[detail] ${error.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = params.keyword || "";
    const page = parseInt(params.page || "1", 10);
    await OmniBox.log("info", `[search] keyword=${keyword}, page=${page}`);
    if (!keyword) return { list: [], page: 1, pagecount: 0, total: 0 };

    const resultsArrays = await Promise.all(SITES.map((site) => fetchSiteSearch(site, keyword, page)));
    const allResults = resultsArrays.flat();
    await OmniBox.log("info", `[search] total=${allResults.length}`);
    return { list: allResults, page, pagecount: 1, total: allResults.length };
  } catch (error) {
    await OmniBox.log("error", `[search] ${error.message}`);
    return { list: [], page: 1, pagecount: 0, total: 0 };
  }
}

async function play(params, context) {
  try {
    const playId = params.playId || "";
    const flag = params.flag || "";
    const from = context?.from || "web";
    const drives = context?.drives || [];
    await OmniBox.log("info", `[play] flag=${flag}, playId=${playId}`);

    if (!playId) return { urls: [], flag, header: {}, danmaku: [] };

    if (playId.startsWith("link://")) {
      const baseId = playId.split("?")[0];
      const match = baseId.match(/^link:\/\/([^/]+)\/(.+)$/);
      if (match) {
        const [, driveKey, encodedUrl] = match;
        const url = decodeURIComponent(encodedUrl);
        const drive = drives.find((o) => o.key === driveKey);
        if (drive) {
          try {
            return await drive.play(url, flag);
          } catch (error) {
            return { error: `播放失败: ${error.message}` };
          }
        }
      }
    }

    const parts = playId.split("|");
    if (parts.length < 2) return { urls: [], flag, header: {}, danmaku: [] };

    const shareURL = parts[0];
    const fileId = parts[1];
    const rawScrapeKey = parts[2] || "";
    const fallbackDanmakuFileName = parts[3] ? decodeURIComponent(parts[3]) : "";
    const scrapeKey = rawScrapeKey ? `${rawScrapeKey.split("@@")[0]}@@${encodeURIComponent(shareURL)}` : "";
    
    let routeType = from === "web" ? "服务端代理" : "直连";
    if (flag.includes("-")) {
      const flagParts = flag.split("-");
      routeType = flagParts[flagParts.length - 1];
    }
    await OmniBox.log("info", `[play] 使用线路: ${routeType}`);

    // ==================== 并行处理：主链路(播放地址) + 辅链路(刮削元数据/弹幕) ====================
    const playInfoPromise = OmniBox.getDriveVideoPlayInfo(shareURL, fileId, routeType);
    const metadataPromise = (async () => {
      const result = {
        danmakuList: [],
        scrapeTitle: "",
        scrapePic: "",
        episodeNumber: null,
        episodeName: params.episodeName || "",
      };

      if (!scrapeKey) return result;

      try {
        const metadata = await OmniBox.getScrapeMetadata(scrapeKey);
        if (!metadata || !metadata.scrapeData || !Array.isArray(metadata.videoMappings)) {
          await OmniBox.log("warn", `[play] 未获取到有效的刮削元数据`);
          return result;
        }

        const formattedFileId = `${shareURL}|${fileId}|${scrapeKey}`;
        const matchedMapping = metadata.videoMappings.find((mapping) => mapping && mapping.fileId === formattedFileId);
        if (!matchedMapping) {
          await OmniBox.log("warn", `[play] 未找到文件映射: ${formattedFileId}`);
          return result;
        }

        const scrapeData = metadata.scrapeData;
        result.scrapeTitle = scrapeData.title || "";
        if (scrapeData.posterPath) {
          result.scrapePic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
        }

        if (matchedMapping.episodeNumber) {
          result.episodeNumber = matchedMapping.episodeNumber;
        }
        if (matchedMapping.episodeName && !result.episodeName) {
          result.episodeName = matchedMapping.episodeName;
        }

        // 生成 fileName 用于弹幕匹配（参考木偶.js）
        let fileName = "";
        const scrapeType = metadata.scrapeType || "";
        if (scrapeType === "movie") {
          fileName = scrapeData.title || "";
        } else {
          const title = scrapeData.title || "";
          const seasonAirYear = scrapeData.seasonAirYear || "";
          const seasonNumber = matchedMapping.seasonNumber || 1;
          const episodeNum = matchedMapping.episodeNumber || 1;
          fileName = `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`;
        }

        if (fileName) {
          await OmniBox.log("info", `[play] 生成fileName用于弹幕匹配: ${fileName}`);
          const matchedDanmaku = await OmniBox.getDanmakuByFileName(fileName);
          if (Array.isArray(matchedDanmaku) && matchedDanmaku.length > 0) {
            result.danmakuList = matchedDanmaku;
            await OmniBox.log("info", `[play] 弹幕匹配成功,找到 ${matchedDanmaku.length} 条弹幕`);
          }
        }
      } catch (error) {
        await OmniBox.log("warn", `[play] 弹幕匹配失败: ${error.message}`);
      }

      return result;
    })();

    const [playInfoResult, metadataResult] = await Promise.allSettled([playInfoPromise, metadataPromise]);

    if (playInfoResult.status !== "fulfilled") {
      throw new Error(playInfoResult.reason && playInfoResult.reason.message ? playInfoResult.reason.message : "无法获取播放地址");
    }

    const playInfo = playInfoResult.value;
    if (!playInfo || !playInfo.url || !Array.isArray(playInfo.url) || playInfo.url.length === 0) {
      throw new Error("无法获取播放地址");
    }

    let danmakuList = [];
    let scrapeTitle = "";
    let scrapePic = "";
    let episodeNumber = null;
    let episodeName = params.episodeName || "";

    if (metadataResult.status === "fulfilled" && metadataResult.value) {
      danmakuList = metadataResult.value.danmakuList || [];
      scrapeTitle = metadataResult.value.scrapeTitle || "";
      scrapePic = metadataResult.value.scrapePic || "";
      episodeNumber = metadataResult.value.episodeNumber || null;
      episodeName = metadataResult.value.episodeName || episodeName;
    } else if (metadataResult.status === "rejected") {
      await OmniBox.log("warn", `[play] 获取元数据失败(不影响播放): ${metadataResult.reason && metadataResult.reason.message ? metadataResult.reason.message : metadataResult.reason}`);
    }

    // ==================== 添加观看记录（参考木偶.js）====================
    try {
      const sourceId = context.sourceId;
      if (sourceId) {
        const dedupeKey = `${sourceId}|${playId}`;
        const now = Date.now();
        const lastAdded = playHistoryDedupeCache.get(dedupeKey);
        if (lastAdded && now - lastAdded < 2000) {
          await OmniBox.log("info", `[play] 跳过重复观看记录: ${dedupeKey}`);
        } else {
          playHistoryDedupeCache.set(dedupeKey, now);
          const title = params.title || scrapeTitle || shareURL;
          const pic = params.pic || scrapePic || "";

          OmniBox.addPlayHistory({
            vodId: scrapeKey,
            title: title,
            pic: pic,
            episode: playId,
            sourceId: sourceId,
            episodeNumber: episodeNumber,
            episodeName: episodeName,
          })
            .then((added) => {
              if (added) {
                OmniBox.log("info", `[play] 已添加观看记录: ${title}`);
              } else {
                OmniBox.log("info", `[play] 观看记录已存在,跳过添加: ${title}`);
              }
            })
            .catch((error) => {
              OmniBox.log("warn", `[play] 添加观看记录失败: ${error.message}`);
            });
        }
      }
    } catch (error) {
      await OmniBox.log("warn", `[play] 添加观看记录失败: ${error.message}`);
    }

    const urls = playInfo.url.map((item) => ({ name: item.name || "播放", url: item.url }));
    const header = playInfo.header || {};
    const finalDanmakuList = danmakuList.length > 0 ? danmakuList : playInfo.danmaku || [];

    await OmniBox.log("info", `[play] urls=${urls.length}, danmaku=${finalDanmakuList.length}, scrape=${ENABLE_SCRAPE ? "on" : "off"}`);
    return {
      urls,
      flag: shareURL,
      header: header,
      parse: 0,
      danmaku: finalDanmakuList,
    };
  } catch (error) {
    await OmniBox.log("error", `[play] ${error.message}`);
    return { urls: [], flag: params.flag || "", header: {}, danmaku: [] };
  }
}
