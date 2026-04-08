// @name 番茄畅听
// @author 
// @description 
// @dependencies: crypto-js
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/听书/番茄畅听.js


/**
 * OmniBox 听书源脚本：番茄畅听
 *
 * 改造说明：
 * 1. 将原 T4 路由脚本转换为 OmniBox 标准五方法：home/category/search/detail/play
 * 2. 保留原站点核心链路：发现页分类、搜索、书籍详情、章节列表、内容直链
 * 3. 风格与注释结构参照模板脚本，便于统一维护
 */

const CryptoJS = require("crypto-js");
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
const API_HOST = "https://qkfqapi.vv9v.cn";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36",
  Referer: `${API_HOST}/`,
};

// 顶级分类映射（保留原脚本排序）
const CLASS_MAPPING = {
  "899": "精品小说",
  "445": "相声评书",
  "12": "世界历史",
  "132": "名家解说",
  "449": "学习成长",
  "113": "恐怖惊悚",
  "960": "生动百科",
  "450": "家教育儿",
  "447": "人文科学",
  "39": "其他",
};

const CLASS_SORT_KEYS = ["899", "12", "445", "132", "449", "113", "960", "450", "447", "39"];
// ==================== 配置区域结束 ====================

/**
 * Info 日志
 * @param {string} message 日志文本
 * @param {Object|null} data 附加数据
 */
function logInfo(message, data = null) {
  const text = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[番茄畅听] ${text}`);
}

/**
 * Error 日志
 * @param {string} message 日志文本
 * @param {any} error 错误对象
 */
function logError(message, error) {
  OmniBox.log("error", `[番茄畅听] ${message}: ${error?.message || String(error)}`);
}

/**
 * 安全转换整数
 * @param {any} value 输入值
 * @param {number} defaultValue 默认值
 * @returns {number}
 */
function toInt(value, defaultValue = 0) {
  const n = parseInt(String(value ?? ""), 10);
  return Number.isNaN(n) ? defaultValue : n;
}

/**
 * 组装 URL
 * @param {string} base 基础 URL
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
 * GET 请求 JSON
 * @param {string} url 完整请求地址
 * @returns {Promise<Object>}
 */
async function requestJSON(url) {
  const response = await OmniBox.request(url, {
    method: "GET",
    headers: DEFAULT_HEADERS,
  });

  if (response.statusCode !== 200) {
    throw new Error(`HTTP ${response.statusCode}`);
  }

  return JSON.parse(response.body || "{}");
}

/**
 * 获取分类列表（按固定顺序）
 * @returns {Array}
 */
function getClasses() {
  return CLASS_SORT_KEYS.map((key) => ({
    type_id: key,
    type_name: CLASS_MAPPING[key] || key,
  }));
}

/**
 * 将发现页条目格式化为标准列表项
 * @param {Object} item 原始条目
 * @returns {Object|null}
 */
function formatDiscoverItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const vodId = String(item.book_id || item.BookId || "");
  if (!vodId) {
    return null;
  }

  return {
    vod_id: vodId,
    vod_name: String(item.book_name || item.BookName || ""),
    vod_pic: String(item.thumb_url || item.ThumbURL || item.audio_thumb_uri || ""),
    vod_remarks: String(item.author || item.Author || ""),
    vod_content: String(item.abstract || item.Abstract || item.book_abstract_v2 || ""),
  };
}

/**
 * 拉取分类数据
 * 兼容旧逻辑：当存在 extend.type 时优先使用
 * @param {string} categoryId 顶级分类 ID
 * @param {number|string} page 页码
 * @param {Object} extend 扩展筛选对象
 * @returns {Promise<Object>}
 */
async function fetchCategoryList(categoryId, page = 1, extend = {}) {
  const pg = toInt(page, 1);
  const typeId = String((extend && extend.type) ? extend.type : categoryId || "899");

  const url = buildURL(`${API_HOST}/api/discover`, {
    tab: "听书",
    type: typeId,
    gender: 2,
    genre_type: 1,
    page: pg,
  });

  const data = await requestJSON(url);
  const rawList = data?.code === 200 && Array.isArray(data?.data) ? data.data : [];
  const list = rawList.map((it) => formatDiscoverItem(it)).filter(Boolean);

  return {
    page: pg,
    pagecount: list.length < 12 ? pg : pg + 1,
    total: 999,
    list,
  };
}

/**
 * 拉取书籍详情 + 章节列表
 * @param {string} bookId 书籍 ID
 * @returns {Promise<Object|null>}
 */
async function fetchDetail(bookId) {
  const id = String(bookId || "").trim();
  if (!id) {
    return null;
  }

  // 详情接口
  const detailURL = buildURL(`${API_HOST}/api/detail`, { book_id: id });
  const detailRes = await requestJSON(detailURL);
  const detailData = detailRes?.data?.data || {};

  // 章节接口
  const chapterURL = buildURL(`${API_HOST}/api/book`, { book_id: id });
  const chapterRes = await requestJSON(chapterURL);
  const bookData = chapterRes?.data?.data || {};

  // 兼容 chapterListWithVolume / chapterList
  let chapterList = [];
  if (Array.isArray(bookData.chapterListWithVolume)) {
    chapterList = bookData.chapterListWithVolume.reduce((acc, current) => {
      if (Array.isArray(current)) {
        acc.push(...current);
      }
      return acc;
    }, []);
  } else if (Array.isArray(bookData.chapterList)) {
    chapterList = bookData.chapterList;
  }

  const episodes = chapterList
    .map((it, index) => {
      const itemId = String(it?.itemId || "").trim();
      if (!itemId) {
        return null;
      }
      const title = String(it?.title || `第${index + 1}集`).trim();
      return {
        name: title,
        playId: itemId,
      };
    })
    .filter(Boolean);

  return {
    vod_id: id,
    vod_name: String(detailData.book_name || ""),
    type_name: String(detailData.category || ""),
    vod_pic: String(detailData.thumb_url || detailData.expand_thumb_url || ""),
    vod_content: String(detailData.abstract || detailData.book_abstract_v2 || ""),
    vod_remarks: String(detailData.sub_info || ""),
    vod_director: String(detailData.author || ""),
    vod_play_sources: episodes.length
      ? [
          {
            name: "番茄畅听",
            episodes,
          },
        ]
      : [],
  };
}

/**
 * 搜索结果项格式化
 * @param {Object} item 原始搜索项
 * @returns {Object|null}
 */
function formatSearchItem(item) {
  const book = Array.isArray(item?.book_data) ? item.book_data[0] : null;
  if (!book) {
    return null;
  }

  const vodId = String(book.book_id || "");
  if (!vodId) {
    return null;
  }

  return {
    vod_id: vodId,
    vod_name: String(book.book_name || ""),
    vod_pic: String(book.thumb_url || ""),
    vod_remarks: String(book.author || ""),
    vod_content: String(book.book_abstract || book.abstract || ""),
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

  const offset = (pg - 1) * 10;
  const url = buildURL(`${API_HOST}/api/search`, {
    key: wd,
    tab_type: 2,
    offset,
  });

  const data = await requestJSON(url);
  const searchTabs = Array.isArray(data?.data?.search_tabs) ? data.data.search_tabs : [];

  // 兼容原逻辑优先第 5 个 tab，同时增加兜底扫描
  let rawList = [];
  if (searchTabs[4] && Array.isArray(searchTabs[4]?.data)) {
    rawList = searchTabs[4].data;
  } else {
    for (const tab of searchTabs) {
      if (Array.isArray(tab?.data) && tab.data.some((i) => Array.isArray(i?.book_data) && i.book_data.length > 0)) {
        rawList = tab.data;
        break;
      }
    }
  }

  const list = rawList.map((it) => formatSearchItem(it)).filter(Boolean);
  return {
    page: pg,
    pagecount: list.length < 10 ? pg : pg + 1,
    total: 999,
    list,
  };
}

/**
 * 解析播放地址
 * 说明：
 * - 输入 playId 为 item_id
 * - 按原脚本处理，不返回 header，避免播放器带 Referer 触发 403
 * @param {string} itemId 章节 item_id
 * @returns {Promise<Object>}
 */
async function resolvePlayURL(itemId) {
  const id = String(itemId || "").trim();
  if (!id) {
    return { urls: [], parse: 0, header: {} };
  }

  const url = buildURL(`${API_HOST}/api/content`, {
    item_id: id,
    tab: "听书",
    tone_id: 1,
  });

  const data = await requestJSON(url);
  const finalURL = String(data?.data?.content || "").trim();

  return {
    urls: finalURL ? [{ name: "番茄畅听", url: finalURL }] : [],
    parse: 0,
    // 保持空 header，避免 Referer 导致 403
    header: {},
  };
}

/**
 * 首页
 * 返回分类 + 默认分类第一页推荐
 */
async function home(params) {
  try {
    const classes = getClasses();
    const page = toInt(params?.page, 1);
    const firstClassId = classes[0]?.type_id || "899";
    const listData = await fetchCategoryList(firstClassId, page, {});

    logInfo("首页获取成功", { classCount: classes.length, listCount: listData.list.length });
    return {
      class: classes,
      list: listData.list,
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
 * @param {Object|string} params.extend 扩展筛选（可选）
 */
async function category(params) {
  try {
    const categoryId = String(params?.categoryId || "899");
    const page = toInt(params?.page, 1);

    let extend = params?.extend || {};
    if (typeof extend === "string") {
      try {
        extend = JSON.parse(CryptoJS.enc.Base64.parse(extend).toString(CryptoJS.enc.Utf8));
      } catch (_) {
        extend = {};
      }
    }

    const result = await fetchCategoryList(categoryId, page, extend);
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
    const keyword = String(params?.keyword || params?.wd || "").trim();
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
 * @param {string} params.videoId 书籍 ID
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
 * @param {string} params.playId 章节 item_id
 */
async function play(params) {
  try {
    const playId = String(params?.playId || "").trim();
    if (!playId) {
      throw new Error("播放ID不能为空");
    }

    return await resolvePlayURL(playId);
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

// 使用公共 runner 执行入口
const runner = require("spider_runner");
runner.run(module.exports);

