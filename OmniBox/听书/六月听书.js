// @name 六月听书
// @author 
// @description 
// @dependencies: crypto-js, cheerio
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/听书/六月听书.js


/**
 * OmniBox 听书源脚本：六月听书
 *
 * 改造说明：
 * 1. 将原 T4 路由式写法转换为 OmniBox 标准 5 方法：home/category/search/detail/play
 * 2. 保留原站点核心逻辑：分类抓取、详情解析、签名播放接口
 * 3. 注释和结构风格参考采集站模板，便于后续统一维护
 */

const CryptoJS = require("crypto-js");
const cheerio = require("cheerio");
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
const SITE_HOST = "http://m.5weiting.com";
const IMG_HOST = "http://img.5weiting.com:20001";
const PAGE_LIMIT = 40;
const SIGN_SECRET = "FRDSHFSKVKSKFKS";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
  "Accept-Language": "zh-CN,zh;q=0.9",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Range": "bytes=0-",
  "Referer": `${SITE_HOST}/`,
};

// 关键点：该站图片需要特定 Referer 才能正常显示
const IMG_HEADERS_SUFFIX = `@Referer=http://m.6yueting.com/@User-Agent=${DEFAULT_HEADERS["User-Agent"]}`;

const CLASS_MAPPING = {
  t0: "全部分类",
  t1: "玄幻奇幻",
  t2: "修真武侠",
  t3: "恐怖灵异",
  t4: "古今言情",
  t28: "都市言情",
  t5: "穿越重生",
  t6: "粤语古仔",
  t7: "网游小说",
  t11: "通俗文学",
  t12: "历史纪实",
  t13: "军事",
  t14: "悬疑推理",
  t18: "ebc5系列",
  t15: "官场商战",
  t16: "儿童读物",
  t17: "广播剧",
  t22: "外文原版",
  t8: "评书大全",
  t9: "相声小品",
  t10: "百家讲坛",
  t20: "健康养生",
  t21: "教材",
  t23: "期刊头条",
  t24: "戏曲",
  t27: "脱口秀",
};
// ==================== 配置区域结束 ====================

/**
 * Info 日志
 * @param {string} message 日志文本
 * @param {Object|null} data 附带数据
 */
function logInfo(message, data = null) {
  const text = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[六月听书] ${text}`);
}

/**
 * Error 日志
 * @param {string} message 日志文本
 * @param {any} error 错误对象
 */
function logError(message, error) {
  OmniBox.log("error", `[六月听书] ${message}: ${error?.message || String(error)}`);
}

/**
 * 安全整数转换
 * @param {any} value 输入值
 * @param {number} defaultValue 默认值
 * @returns {number}
 */
function toInt(value, defaultValue = 0) {
  const num = parseInt(String(value ?? ""), 10);
  return Number.isNaN(num) ? defaultValue : num;
}

/**
 * 去除 HTML 标签
 * @param {string} text 原始文本
 * @returns {string}
 */
function stripHTML(text) {
  return String(text || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

/**
 * 构建 URL
 * @param {string} base 基础地址
 * @param {Object} params 查询参数
 * @returns {string}
 */
function buildURL(base, params = {}) {
  const url = new URL(base);
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.append(key, String(value));
    }
  });
  return url.toString();
}

/**
 * 补全为绝对链接
 * @param {string} href 相对或绝对地址
 * @returns {string}
 */
function toAbsoluteURL(href) {
  const raw = String(href || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${SITE_HOST}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

/**
 * 处理图片地址并追加图片请求头后缀
 * @param {string} img 图片地址
 * @returns {string}
 */
function formatImageURL(img) {
  const url = toAbsoluteURL(img);
  if (!url) return "";
  return `${url}${IMG_HEADERS_SUFFIX}`;
}

/**
 * GET 请求文本
 * @param {string} url 请求地址
 * @returns {Promise<string>}
 */
async function requestText(url) {
  const response = await OmniBox.request(url, {
    method: "GET",
    headers: DEFAULT_HEADERS,
  });

  if (response.statusCode !== 200) {
    throw new Error(`HTTP ${response.statusCode}`);
  }

  return String(response.body || "");
}

/**
 * GET 请求 JSON
 * @param {string} url 请求地址
 * @returns {Promise<Object>}
 */
async function requestJSON(url) {
  const text = await requestText(url);
  return JSON.parse(text || "{}");
}

/**
 * 获取分类列表
 * @returns {Array}
 */
function getClasses() {
  return Object.entries(CLASS_MAPPING).map(([type_id, type_name]) => ({
    type_id,
    type_name,
  }));
}

/**
 * 解析分类页列表
 * @param {string} html 分类页 HTML
 * @returns {Array}
 */
function parseCategoryHTML(html) {
  const $ = cheerio.load(html || "");
  const list = [];
  const seen = new Set();

  $(".list-wrapper a.item-link, .list-wrapper a, a[href*='/list/']").each((_, element) => {
    const $el = $(element);
    const href = String($el.attr("href") || "").trim();
    if (!href || !href.includes("/list/")) {
      return;
    }

    const vodID = toAbsoluteURL(href);
    if (!vodID || seen.has(vodID)) {
      return;
    }

    let title = "";
    const titleFromH2 = $el.find("h2").first().text().trim();
    const titleFromMore = $el.find(".book-name, .name, .title, .book-title").first().text().trim();
    const titleFromParent = $el.parent().find("h2, .book-name, .name, .title").first().text().trim();
    title = titleFromH2 || titleFromMore || titleFromParent;

    if (!title) {
      return;
    }

    const imgRaw = String($el.find("img").first().attr("src") || "").trim();
    const img = formatImageURL(imgRaw);
    const remarks = $el.find(".status, .label, .tag").first().text().trim();

    seen.add(vodID);
    list.push({
      vod_id: vodID,
      vod_name: title,
      vod_pic: img,
      vod_remarks: remarks,
    });
  });

  return list;
}

/**
 * 获取分类视频列表
 * @param {string} categoryId 分类 ID
 * @param {number|string} page 页码
 * @returns {Promise<Object>}
 */
async function fetchCategoryList(categoryId, page = 1) {
  const type = String(categoryId || "t0");
  const pg = toInt(page, 1);
  const url = `${SITE_HOST}/ys/${type}/o2/${pg}`;

  const html = await requestText(url);
  const list = parseCategoryHTML(html);

  return {
    page: pg,
    pagecount: 999,
    total: list.length,
    list,
  };
}

/**
 * 解析详情页
 * @param {string} videoId 详情页 URL
 * @returns {Promise<Object|null>}
 */
async function fetchDetail(videoId) {
  const detailURL = toAbsoluteURL(videoId);
  if (!detailURL) {
    return null;
  }

  const html = await requestText(detailURL);
  const $ = cheerio.load(html || "");

  const title = $(".book-title").first().text().trim() || $(".text").eq(0).text().trim();
  const img = formatImageURL($(".img").first().attr("src") || "");
  const desc1 = $(".text").eq(3).text().trim();
  const desc2 = $(".text").eq(1).text().trim();
  const desc3 = $(".text").eq(2).text().trim();
  const content = $(".book-intro").first().text().trim();

  // 多线路章节解析：每个 tab 对应一个播放源
  const playSources = [];
  const tabs = $(".operate-bar .total-num");

  tabs.each((tabIndex, tabElement) => {
    const sourceName = $(tabElement).text().trim() || `线路${tabIndex + 1}`;
    const episodes = [];

    $(`.book-list:eq(${tabIndex}) .list-item`).each((episodeIndex, itemElement) => {
      const $item = $(itemElement);
      const episodeName = $item.text().trim() || `第${episodeIndex + 1}集`;
      const episodeHref = $item.attr("href") || "";
      const playId = toAbsoluteURL(episodeHref);
      if (!playId) {
        return;
      }

      episodes.push({
        name: episodeName,
        playId,
      });
    });

    if (episodes.length > 0) {
      playSources.push({
        name: sourceName,
        episodes,
      });
    }
  });

  return {
    vod_id: detailURL,
    vod_name: title || "未知标题",
    vod_pic: img,
    vod_content: content,
    vod_remarks: `${desc1} ${desc2} ${desc3}`.trim(),
    vod_play_sources: playSources,
  };
}

/**
 * 搜索
 * @param {string} keyword 关键词
 * @param {number|string} page 页码
 * @returns {Promise<Object>}
 */
async function fetchSearch(keyword, page = 1) {
  const wd = String(keyword || "").trim();
  const pg = toInt(page, 1);

  if (!wd) {
    return {
      page: 1,
      pagecount: 0,
      total: 0,
      list: [],
    };
  }

  const searchURL = buildURL(`${SITE_HOST}/search/index/search`, {
    content: wd,
    type: 1,
    pageNum: pg,
    pageSize: PAGE_LIMIT,
  });

  const data = await requestJSON(searchURL);
  const content = Array.isArray(data?.data?.content) ? data.data.content : [];

  const list = content.map((it) => {
    const cover = it?.coverUrlLocal ? `${IMG_HOST}/${String(it.coverUrlLocal).replace(/^\/+/, "")}` : "";
    return {
      vod_id: `${SITE_HOST}/list/${it.code}`,
      vod_name: stripHTML(it.name),
      vod_pic: cover ? `${cover}${IMG_HEADERS_SUFFIX}` : "",
      vod_remarks: String(it.cdate || ""),
      vod_content: stripHTML(it.descXx),
    };
  });

  return {
    page: pg,
    pagecount: 999,
    total: list.length,
    list,
  };
}

/**
 * 从章节页 URL 提取 code/no
 * 示例：http://m.5weiting.com/play/xxxx/1
 * @param {string} playPageURL 章节页面地址
 * @returns {{code: string, no: string}}
 */
function extractCodeAndNo(playPageURL) {
  const url = String(playPageURL || "");
  const matched = url.match(/\/play\/([^/]+)\/([^/?#]+)/i);
  if (matched) {
    return {
      code: matched[1],
      no: matched[2],
    };
  }

  // 兼容旧逻辑 split 索引
  const parts = url.split("/").filter(Boolean);
  return {
    code: parts[3] || "",
    no: parts[4] || "",
  };
}

/**
 * 安全解码 URL（兼容 %xx 与旧式编码）
 * @param {string} value 编码字符串
 * @returns {string}
 */
function safeDecodeURL(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    return decodeURIComponent(raw);
  } catch (_) {
    try {
      return unescape(raw);
    } catch (__)
 {
      return raw;
    }
  }
}

/**
 * 解析真实播放地址
 * @param {string} playPageURL 章节页面地址
 * @returns {Promise<Object>}
 */
async function resolvePlayURL(playPageURL) {
  const { code, no } = extractCodeAndNo(playPageURL);
  if (!code || !no) {
    return {
      urls: [],
      parse: 0,
      header: {},
    };
  }

  const timestamp = Date.now();
  const sign = CryptoJS.MD5(`${timestamp}${code}${no}${SIGN_SECRET}`).toString();

  const apiURL = buildURL(`${SITE_HOST}/web/index/video_new`, {
    code,
    no,
    type: 0,
    timestamp,
    sign,
  });

  const data = await requestJSON(apiURL);
  const encodedURL = String(data?.data?.videoUrl || "").trim();
  const finalURL = safeDecodeURL(encodedURL);

  return {
    urls: finalURL ? [{ name: "六月听书", url: finalURL }] : [],
    parse: 0,
    header: DEFAULT_HEADERS,
  };
}

/**
 * 首页
 * 返回分类 + 默认推荐（t0 第 1 页）
 */
async function home(params) {
  try {
    const classes = getClasses();
    const page = toInt(params?.page, 1);
    const categoryResult = await fetchCategoryList("t0", page);

    logInfo("首页获取成功", { classCount: classes.length, listCount: categoryResult.list.length });
    return {
      class: classes,
      list: categoryResult.list,
    };
  } catch (error) {
    logError("首页获取失败", error);
    return {
      class: getClasses(),
      list: [],
    };
  }
}

/**
 * 分类
 * @param {Object} params
 * @param {string} params.categoryId 分类 ID
 * @param {number|string} params.page 页码
 */
async function category(params) {
  try {
    const categoryId = String(params?.categoryId || "t0");
    const page = toInt(params?.page, 1);
    const result = await fetchCategoryList(categoryId, page);

    logInfo("分类获取成功", { categoryId, page, count: result.list.length });
    return result;
  } catch (error) {
    logError("分类获取失败", error);
    return {
      page: 1,
      pagecount: 1,
      total: 0,
      list: [],
    };
  }
}

/**
 * 搜索
 * @param {Object} params
 * @param {string} params.keyword 关键词
 * @param {string} params.wd 兼容字段
 * @param {number|string} params.page 页码
 */
async function search(params) {
  try {
    const keyword = params?.keyword || params?.wd || "";
    const page = toInt(params?.page, 1);
    const result = await fetchSearch(keyword, page);

    logInfo("搜索完成", { keyword, page, count: result.list.length });
    return result;
  } catch (error) {
    logError("搜索失败", error);
    return {
      page: 1,
      pagecount: 1,
      total: 0,
      list: [],
    };
  }
}

/**
 * 详情
 * @param {Object} params
 * @param {string} params.videoId 视频详情 URL
 */
async function detail(params) {
  try {
    const videoId = String(params?.videoId || "").trim();
    if (!videoId) {
      throw new Error("视频ID不能为空");
    }

    const detailItem = await fetchDetail(videoId);
    return {
      list: detailItem ? [detailItem] : [],
    };
  } catch (error) {
    logError("详情获取失败", error);
    return {
      list: [],
    };
  }
}

/**
 * 播放
 * @param {Object} params
 * @param {string} params.playId 章节页 URL（非直链）
 */
async function play(params) {
  try {
    const playId = String(params?.playId || "").trim();
    if (!playId) {
      throw new Error("播放ID不能为空");
    }

    const result = await resolvePlayURL(playId);
    return result;
  } catch (error) {
    logError("播放地址解析失败", error);
    return {
      urls: [],
      parse: 0,
      header: {},
    };
  }
}

// 导出标准方法
module.exports = {
  home,
  category,
  search,
  detail,
  play,
};

// 使用公共 runner 接管脚本 I/O
const runner = require("spider_runner");
runner.run(module.exports);

