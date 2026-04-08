// @name 酷我听书
// @author @lucky_TJQ
// @description 
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/听书/酷我听书.js

/**
 * OmniBox 听书源脚本：酷我听书
 *
 * 改造说明：
 * 1. 将原 不夜 T4 路由式写法转换为 OmniBox 标准五方法：home/category/search/detail/play
 * 2. 保留原站点核心逻辑：分类筛选、强制翻页、搜索、专辑详情、章节播放
 * 3. 注释和结构风格参照模板脚本，便于统一维护
 */

const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
const API_HOST = "http://tingshu.kuwo.cn";
const SEARCH_HOST = "http://search.kuwo.cn";
const PLAY_HOST = "http://mobi.kuwo.cn";

const USER_AGENT = "kwplayer_ar_9.1.8.1_tvivo.apk";
const PAGE_SIZE = 21;

// 固定分类
const CLASS_LIST = [
  { type_id: "2", type_name: "有声小说" },
  { type_id: "37", type_name: "音乐金曲" },
  { type_id: "5", type_name: "相声评书" },
  { type_id: "62", type_name: "影视原声" },
];

// 强制翻页配置（用于 VIP/排序筛选后补齐结果）
const FORCE_PAGE_CONFIG = {
  enabled: true,
  maxPage: 10,
  pageSize: 21,
};

// 分类筛选（保留原脚本）
const CLASS_FILTERS = {
  "2": [
    {
      key: "class",
      name: "类型",
      init: "42",
      value: [
        { n: "都市传说", v: "42" },
        { n: "玄幻奇幻", v: "44" },
        { n: "武侠仙侠", v: "48" },
        { n: "穿越架空", v: "52" },
        { n: "科幻竞技", v: "57" },
        { n: "幻想言情", v: "169" },
        { n: "独家定制", v: "170" },
        { n: "古代言情", v: "207" },
        { n: "影视原著", v: "213" },
        { n: "悬疑推理", v: "45" },
        { n: "历史军事", v: "56" },
        { n: "现代言情", v: "41" },
        { n: "青春校园", v: "55" },
        { n: "文学名著", v: "61" },
      ],
    },
  ],
  "5": [
    {
      key: "class",
      name: "类型",
      init: "220",
      value: [
        { n: "评书大全", v: "220" },
        { n: "小品合辑", v: "221" },
        { n: "单口相声", v: "219" },
        { n: "热门相声", v: "218" },
        { n: "相声名家", v: "290" },
        { n: "粤语评书", v: "320" },
        { n: "相声新人", v: "222" },
        { n: "张少佐", v: "313" },
        { n: "刘立福", v: "314" },
        { n: "刘兰芳", v: "309" },
        { n: "连丽如", v: "311" },
        { n: "田占义", v: "317" },
        { n: "袁阔成", v: "310" },
        { n: "孙一", v: "315" },
        { n: "王玥波", v: "316" },
        { n: "单田芳", v: "217" },
        { n: "关永超", v: "325" },
        { n: "马长辉", v: "326" },
        { n: "赵维莉", v: "327" },
        { n: "单口相声", v: "1536" },
        { n: "潮剧", v: "1718" },
        { n: "沪剧", v: "1719" },
        { n: "晋剧", v: "1720" },
      ],
    },
  ],
  "37": [
    {
      key: "class",
      name: "类型",
      init: "253",
      value: [
        { n: "抖音神曲", v: "253" },
        { n: "怀旧老歌", v: "252" },
        { n: "创作翻唱", v: "248" },
        { n: "催眠", v: "254" },
        { n: "古风", v: "255" },
        { n: "博客周刊", v: "1423" },
        { n: "民谣", v: "1409" },
        { n: "纯音乐", v: "1408" },
        { n: "3D电音", v: "1407" },
        { n: "音乐课程", v: "1380" },
        { n: "音乐推荐", v: "250" },
        { n: "音乐故事", v: "247" },
        { n: "情感推荐", v: "246" },
        { n: "儿童音乐", v: "249" },
      ],
    },
  ],
  "62": [
    {
      key: "class",
      name: "类型",
      init: "1485",
      value: [
        { n: "影视广播", v: "1485" },
        { n: "影视解读", v: "1483" },
        { n: "影视原著", v: "1486" },
        { n: "陪你追剧", v: "1398" },
        { n: "经典原声", v: "1482" },
      ],
    },
  ],
};

// VIP 筛选
const VIP_FILTER = {
  key: "vip",
  name: "权限",
  init: "",
  value: [
    { n: "全部权限", v: "" },
    { n: "免费权限", v: "0" },
    { n: "会员权限", v: "1" },
  ],
};

// 排序筛选
const SORT_FILTER = {
  key: "sort",
  name: "排序",
  init: "tsScore",
  value: [
    { n: "综合排序", v: "tsScore" },
    { n: "最新上架", v: "pubDate" },
    { n: "按总播放", v: "playCnt" },
  ],
};
// ==================== 配置区域结束 ====================

/**
 * Info 日志
 */
function logInfo(message, data = null) {
  const text = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[酷我听书] ${text}`);
}

/**
 * Error 日志
 */
function logError(message, error) {
  OmniBox.log("error", `[酷我听书] ${message}: ${error?.message || String(error)}`);
}

/**
 * 安全整数转换
 */
function toInt(value, defaultValue = 0) {
  const num = parseInt(String(value ?? ""), 10);
  return Number.isNaN(num) ? defaultValue : num;
}

/**
 * 构建 URL
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
 * 通用 GET 请求
 * - 某些搜索接口返回单引号伪 JSON，这里兼容解析
 */
async function requestJSON(url, refererHost = API_HOST, tryFixSingleQuotes = false) {
  const response = await OmniBox.request(url, {
    method: "GET",
    headers: {
      "User-Agent": USER_AGENT,
      Referer: refererHost,
    },
  });

  if (response.statusCode !== 200) {
    throw new Error(`HTTP ${response.statusCode}`);
  }

  const body = String(response.body || "").trim();
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch (_) {
    if (tryFixSingleQuotes) {
      try {
        return JSON.parse(body.replace(/'/g, '"'));
      } catch (err2) {
        throw new Error(`JSON解析失败: ${err2.message}`);
      }
    }
    // 如果内容本身不是 JSON，直接返回字符串
    return body;
  }
}

/**
 * 格式化播放量
 */
function formatPlayCnt(cnt) {
  const n = Number(cnt || 0);
  if (!n) return "0";
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}亿`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return String(n);
}

/**
 * 根据 type_id 获取分类名称
 */
function getCategoryName(typeId) {
  const target = CLASS_LIST.find((c) => c.type_id === String(typeId));
  return target ? target.type_name : "";
}

/**
 * 将分类接口项映射为标准列表结构
 */
function mapAlbumItemToVod(item, categoryName = "") {
  const vipTag = Number(item?.vip) === 1 ? "会员" : "免费";
  const playCnt = formatPlayCnt(item?.playCnt);
  return {
    vod_id: String(item?.albumId || ""),
    vod_name: String(item?.albumName || ""),
    vod_pic: String(item?.coverImg || ""),
    vod_remarks: `${vipTag} | ${playCnt}次播放 | ${categoryName || item?.artist || ""}`.trim(),
  };
}

/**
 * 获取分类筛选默认 class 值
 */
function getDefaultClassifyId(typeId) {
  const cfg = CLASS_FILTERS[String(typeId)];
  if (Array.isArray(cfg) && cfg[0] && cfg[0].init) {
    return String(cfg[0].init);
  }
  return "44";
}

/**
 * 构建酷我分类筛选请求 URL
 */
function buildCategoryURL({ typeId, classifyId, sortType, page, pageSize }) {
  return buildURL(`${API_HOST}/v2/api/search/filter/albums`, {
    classifyId,
    notrace: 0,
    source: "kwplayer_ar_9.1.8.1_tvivo.apk",
    platform: 1,
    uid: 2511482006,
    sortType,
    loginUid: 540339516,
    bksource: "kwbook_ar_9.1.8.1_tvivo.apk",
    rn: pageSize,
    categoryId: typeId,
    pn: page,
  });
}

/**
 * 获取首页推荐（每个顶级分类取一页）
 */
async function fetchHomeList(page = 1) {
  const all = [];

  for (const cls of CLASS_LIST) {
    const url = buildCategoryURL({
      typeId: cls.type_id,
      classifyId: getDefaultClassifyId(cls.type_id),
      sortType: SORT_FILTER.init,
      page,
      pageSize: 12,
    });

    try {
      const data = await requestJSON(url, API_HOST, false);
      const rawList = Array.isArray(data?.data?.data) ? data.data.data : [];
      for (const item of rawList) {
        all.push(mapAlbumItemToVod(item, cls.type_name));
      }
    } catch (error) {
      logError(`首页分类获取失败 ${cls.type_name}`, error);
    }
  }

  return all;
}

/**
 * 分类强制翻页
 * - 当开启 VIP 筛选且当前页过滤后为空时，自动向后翻页
 */
async function fetchCategoryWithForcePage(typeId, classifyId, sortType, vipFilterValue, targetPage) {
  const categoryName = getCategoryName(typeId);
  let currentPage = toInt(targetPage, 1);
  let attempts = 0;

  while (attempts < FORCE_PAGE_CONFIG.maxPage) {
    const url = buildCategoryURL({
      typeId,
      classifyId,
      sortType,
      page: currentPage,
      pageSize: FORCE_PAGE_CONFIG.pageSize,
    });

    const data = await requestJSON(url, API_HOST, false);
    const rawList = Array.isArray(data?.data?.data) ? data.data.data : [];

    if (rawList.length === 0) {
      attempts += 1;
      currentPage += 1;
      continue;
    }

    let filtered = rawList;
    const vipValue = String(vipFilterValue ?? "");
    if (vipValue !== "") {
      filtered = rawList.filter((it) => Number(it?.vip) === Number(vipValue));
    }

    if (filtered.length > 0 || vipValue === "") {
      return {
        items: filtered.map((it) => mapAlbumItemToVod(it, categoryName)),
        hasMore: rawList.length >= FORCE_PAGE_CONFIG.pageSize,
      };
    }

    attempts += 1;
    currentPage += 1;
  }

  return { items: [], hasMore: false };
}

/**
 * 搜索
 */
async function fetchSearchList(keyword, page = 1) {
  const wd = String(keyword || "").trim();
  const pg = toInt(page, 1);
  if (!wd) {
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }

  // 酷我搜索页码从 0 开始
  const pn = Math.max(0, pg - 1);
  const url = buildURL(`${SEARCH_HOST}/r.s`, {
    client: "kt",
    all: wd,
    ft: "album",
    newsearch: 1,
    itemset: "web_2013",
    cluster: 0,
    pn,
    rn: PAGE_SIZE,
    rformat: "json",
    encoding: "utf8",
    show_copyright_off: 1,
    vipver: "MUSIC_8.0.3.0_BCS75",
    show_series_listen: 1,
    version: "9.1.8.1",
  });

  const data = await requestJSON(url, SEARCH_HOST, true);
  const albumList = Array.isArray(data?.albumlist) ? data.albumlist : [];
  const total = toInt(data?.TOTAL, albumList.length);

  const list = albumList.map((item) => {
    const vipTag = Number(item?.vip) === 1 ? "会员" : "免费";
    return {
      vod_id: String(item?.DC_TARGETID || ""),
      vod_name: String(item?.name || ""),
      vod_pic: String(item?.img || ""),
      vod_remarks: `${vipTag} | ${item?.artist || ""}`.trim(),
    };
  });

  return {
    page: pg,
    pagecount: Math.min(100, Math.max(1, Math.ceil(total / PAGE_SIZE))),
    total,
    list,
  };
}

/**
 * 获取专辑详情 + 章节
 */
async function fetchDetailInfo(albumId) {
  const id = String(albumId || "").trim();
  if (!id) return null;

  const url = buildURL(`${SEARCH_HOST}/r.s`, {
    stype: "albuminfo",
    user: "8d378d72qw28f5f4",
    uid: 2511552006,
    loginUid: 540129516,
    loginSid: 958467960,
    prod: "kwplayer_ar_9.1.8.1",
    bkprod: "kwbook_ar_9.1.8.1",
    source: "kwplayer_ar_9.1.8.1_tvivo.apk",
    bksource: "kwbook_ar_9.1.8.1_tvivo.apk",
    corp: "kuwo",
    albumid: id,
    pn: 0,
    rn: 5000,
    show_copyright_off: 1,
    vipver: "MUSIC_8.2.0.0_BCS17",
    mobi: 1,
    iskwbook: 1,
  });

  const data = await requestJSON(url, SEARCH_HOST, true);
  const albumInfo = data?.albuminfo || {};
  const musicList = Array.isArray(data?.musiclist) ? data.musiclist : [];
  if (musicList.length === 0) {
    return null;
  }

  const episodes = musicList.map((track, index) => {
    const playUrl = buildURL(`${PLAY_HOST}/mobi.s`, {
      f: "web",
      source: "kwplayerhd_ar_4.3.0.8_tianbao_T1A_qirui.apk",
      type: "convert_url_with_sign",
      rid: track?.musicrid,
      br: "320kmp3",
    });
    return {
      name: `${index + 1}.${String(track?.name || "")}`,
      playId: playUrl,
    };
  });

  const vipTag = Number(albumInfo?.vip) === 1 ? "会员" : "免费";
  const releaseDate = String(albumInfo?.releaseDate || "");
  const year = releaseDate.includes("-") ? `${releaseDate.split("-")[0]}年` : "";

  return {
    vod_id: id,
    vod_name: String(albumInfo?.name || musicList[0]?.album || "未知专辑"),
    vod_pic: String(albumInfo?.img || musicList[0]?.web_albumpic_short || ""),
    vod_remarks: `${vipTag} | 共${musicList.length}集`,
    vod_content: String(albumInfo?.info || data?.intro || "暂无简介"),
    vod_actor: String(albumInfo?.artist || data?.artist || "未知"),
    vod_director: `播放量: ${formatPlayCnt(albumInfo?.playcnt)}`,
    vod_year: year,
    vod_play_sources: [
      {
        name: "酷我听书",
        episodes,
      },
    ],
  };
}

/**
 * 解析播放地址
 */
async function resolvePlay(playId) {
  const id = String(playId || "").trim();
  if (!id) {
    return { urls: [], parse: 0, header: {} };
  }

  try {
    const data = await requestJSON(id, PLAY_HOST, false);

    if (data?.data?.url) {
      return {
        urls: [{ name: "酷我听书", url: String(data.data.url) }],
        parse: 0,
        header: {
          "User-Agent": USER_AGENT,
          Referer: API_HOST,
        },
      };
    }

    if (typeof data === "string" && /^https?:\/\//i.test(data)) {
      return {
        urls: [{ name: "酷我听书", url: data }],
        parse: 0,
        header: {
          "User-Agent": USER_AGENT,
          Referer: API_HOST,
        },
      };
    }

    return {
      urls: [{ name: "酷我听书", url: id }],
      parse: 0,
      header: {
        "User-Agent": USER_AGENT,
      },
    };
  } catch (error) {
    logError("播放地址解析失败", error);
    return {
      urls: [{ name: "酷我听书", url: id }],
      parse: 0,
      header: {
        "User-Agent": USER_AGENT,
      },
    };
  }
}

/**
 * 首页
 */
async function home(params) {
  try {
    const page = toInt(params?.page, 1);
    const list = await fetchHomeList(page);

    // 为每个分类拼装筛选器（类型 + VIP + 排序）
    const filters = {};
    for (const cls of CLASS_LIST) {
      const typeFilters = Array.isArray(CLASS_FILTERS[cls.type_id]) ? CLASS_FILTERS[cls.type_id] : [];
      filters[cls.type_id] = [...typeFilters, VIP_FILTER, SORT_FILTER];
    }

    logInfo("首页获取成功", { classCount: CLASS_LIST.length, listCount: list.length });
    return {
      class: CLASS_LIST,
      filters,
      list,
    };
  } catch (error) {
    logError("首页获取失败", error);
    return {
      class: CLASS_LIST,
      filters: {},
      list: [],
    };
  }
}

/**
 * 分类
 */
async function category(params) {
  try {
    const typeId = String(params?.categoryId || "").trim();
    const page = toInt(params?.page, 1);
    if (!typeId || !CLASS_LIST.some((c) => c.type_id === typeId)) {
      return { page, pagecount: 1, total: 0, list: [] };
    }

    const ext = params?.extend || {};
    const classifyId = String(ext?.class || getDefaultClassifyId(typeId));
    const vip = ext?.vip !== undefined ? String(ext.vip) : String(VIP_FILTER.init);
    const sort = String(ext?.sort || SORT_FILTER.init);

    const result = FORCE_PAGE_CONFIG.enabled
      ? await fetchCategoryWithForcePage(typeId, classifyId, sort, vip, page)
      : await (async () => {
          const url = buildCategoryURL({
            typeId,
            classifyId,
            sortType: sort,
            page,
            pageSize: PAGE_SIZE,
          });
          const data = await requestJSON(url, API_HOST, false);
          const rawList = Array.isArray(data?.data?.data) ? data.data.data : [];
          const items = rawList.map((it) => mapAlbumItemToVod(it, getCategoryName(typeId)));
          return { items, hasMore: rawList.length >= PAGE_SIZE };
        })();

    return {
      page,
      pagecount: result.hasMore ? 9999 : page,
      total: result.hasMore ? 999999 : result.items.length,
      list: result.items,
    };
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
 */
async function search(params) {
  try {
    const keyword = String(params?.keyword || params?.wd || "").trim();
    const page = toInt(params?.page, 1);
    const result = await fetchSearchList(keyword, page);

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
 */
async function detail(params) {
  try {
    const videoId = String(params?.videoId || "").trim();
    if (!videoId) {
      throw new Error("视频ID不能为空");
    }

    const item = await fetchDetailInfo(videoId);
    return {
      list: item ? [item] : [],
    };
  } catch (error) {
    logError("详情获取失败", error);
    return { list: [] };
  }
}

/**
 * 播放
 */
async function play(params) {
  try {
    const playId = String(params?.playId || "").trim();
    if (!playId) {
      throw new Error("播放ID不能为空");
    }
    return await resolvePlay(playId);
  } catch (error) {
    logError("播放失败", error);
    return { urls: [], parse: 0, header: {} };
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

// 使用公共 runner 执行
const runner = require("spider_runner");
runner.run(module.exports);

