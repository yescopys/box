// @name 世纪音乐
// @author 
// @description 
// @dependencies: axios, cheerio
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/音乐/世纪音乐.js

/**
 * OmniBox - 世纪音乐爬虫（JavaScript 版）
 *
 * 说明：
 * 1. 本脚本将 `本地调试/世纪音乐.py` 的核心能力迁移到 OmniBox JS 规范。
 * 2. 代码组织与注释风格参考 `模板/JavaScript/采集站模板.js`。
 * 3. 支持：首页、分类、搜索、详情、播放（含歌词多源获取）。
 */

const axios = require("axios");
const cheerio = require("cheerio");
const http = require("http");
const https = require("https");
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================

/**
 * 主站地址
 */
const HOST = process.env.SJ_MUSIC_HOST || "https://www.4c44.com";

/**
 * 请求头
 */
const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: `${HOST}/`,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3",
};

/**
 * axios 实例（开启 keep-alive，增强稳定性）
 */
const httpClient = axios.create({
  timeout: 15000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
  headers: DEFAULT_HEADERS,
  maxRedirects: 5,
  validateStatus: (status) => status >= 200 && status < 500,
});

// ==================== 运行时缓存 ====================

/**
 * 首页推荐缓存：key = vod_id, value = 推荐对象
 */
const homeRecommendCache = new Map();

/**
 * 歌词缓存：key = lrc_${songId}
 */
const lrcCache = new Map();

// ==================== 通用工具函数 ====================

function logInfo(message, data = null) {
  const output = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[世纪音乐] ${output}`);
}

function logWarn(message) {
  OmniBox.log("warn", `[世纪音乐] ${message}`);
}

function logError(message, error) {
  OmniBox.log("error", `[世纪音乐] ${message}: ${error?.message || error}`);
}

/**
 * 绝对地址补全
 */
function absUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${HOST}${url}`;
  return `${HOST}/${url}`;
}

/**
 * 清理站点广告/装饰文本
 */
function cleanText(text) {
  if (!text) return "";
  return String(text)
    .replace(
      /(世纪音乐网|MP3免费下载|LRC动态歌词下载|高清MV|车载MV|夜店视频|热门榜单|全部歌曲|第\d+页|刷新|首页|免责声明|版权|非営利性|自动收录|联系邮箱|oeecc#foxmail\.com)/gi,
      ""
    )
    .trim();
}

/**
 * 清理歌曲名（去掉冗余连接符）
 */
function cleanSongName(name) {
  if (!name) return "";
  return String(name).replace(/\s*-\s*$/g, "").replace(/^\s*-\s*/g, "").replace(/\s+/g, " ").trim();
}

/**
 * 图片地址处理
 */
function getImage(url, options = {}) {
  const { isSinger = false, isMV = false } = options;
  if (!url) return "";
  let finalUrl = absUrl(url);
  if (isSinger) {
    finalUrl = finalUrl.replace("param=200y200", "param=500y500").replace("?param=200y200", "?param=500y500");
  }
  if (isMV) {
    finalUrl = finalUrl.replace("?imageView=1&thumbnail=800y", "?imageView=1&thumbnail=1280y720");
  }
  return finalUrl;
}

/**
 * 请求 HTML 并返回 cheerio 实例
 */
async function getDOM(pathOrUrl, retry = 2) {
  const targetUrl = absUrl(pathOrUrl);
  for (let i = 0; i <= retry; i += 1) {
    try {
      const response = await httpClient.get(targetUrl, {
        headers: {
          ...DEFAULT_HEADERS,
          Referer: `${HOST}/`,
        },
      });
      if (response.status === 200 && response.data) {
        return cheerio.load(response.data);
      }
      logWarn(`请求失败 status=${response.status}, url=${targetUrl}`);
    } catch (error) {
      logWarn(`请求异常(${i + 1}/${retry + 1}): ${targetUrl} => ${error.message}`);
    }
  }
  return cheerio.load("<html></html>");
}

/**
 * 通用分页“下一页”判断
 */
function hasNextPage($) {
  const nextLink = $(".pages a:contains('下一页'), .pagination a:contains('下一页'), .page a:contains('下一页')").first();
  if (nextLink && nextLink.length > 0) {
    const href = nextLink.attr("href") || "";
    if (href && href !== "#" && !/javascript:void/i.test(href)) return true;
  }
  return false;
}

/**
 * 生成标准播放源结构
 */
function buildPlaySource(name, episodes) {
  return {
    name: name || "默认线路",
    episodes: Array.isArray(episodes) ? episodes : [],
  };
}

// ==================== 首页分类 ====================

function getHomeClassesAndFilters() {
  const classes = [
    { type_name: "🏠 首页推荐", type_id: "home" },
    { type_name: "📊 排行榜", type_id: "rank_list" },
    { type_name: "📀 歌单", type_id: "playlist" },
    { type_name: "👤 歌手", type_id: "singer" },
    { type_name: "🎬 MV", type_id: "mv" },
  ];

  const filters = {
    singer: [
      {
        key: "sex",
        name: "👤 性别",
        value: [
          { n: "👩 女歌手", v: "girl" },
          { n: "👨 男歌手", v: "male" },
          { n: "🎭 乐队组合", v: "band" },
        ],
      },
      {
        key: "area",
        name: "🌏 地区",
        value: [
          { n: "🇨🇳 华语", v: "huayu" },
          { n: "🌍 欧美", v: "oumei" },
          { n: "🇰🇷 韩国", v: "hanguo" },
          { n: "🇯🇵 日本", v: "riben" },
        ],
      },
      {
        key: "char",
        name: "🔤 字母",
        value: [{ n: "🔤 全部", v: "index" }].concat(
          Array.from({ length: 26 }, (_, i) => {
            const c = String.fromCharCode(65 + i);
            return { n: c, v: c.toLowerCase() };
          })
        ),
      },
    ],
    mv: [
      {
        key: "area",
        name: "🌏 地区",
        value: [
          { n: "🌐 全部地区", v: "index" },
          { n: "🇨🇳 内地", v: "neidi" },
          { n: "🇭🇰 港台", v: "gangtai" },
          { n: "🌍 欧美", v: "oumei" },
          { n: "🇰🇷 韩国", v: "hanguo" },
          { n: "🇯🇵 日本", v: "riben" },
        ],
      },
      {
        key: "type",
        name: "🎬 类型",
        value: [
          { n: "🎬 全部类型", v: "index" },
          { n: "📀 官方版", v: "guanfang" },
          { n: "🎤 原声", v: "yuansheng" },
          { n: "🎸 现场版", v: "xianchang" },
          { n: "🎮 网易出品", v: "wangyi" },
        ],
      },
      {
        key: "sort",
        name: "📊 排序",
        value: [
          { n: "✨ 最新", v: "new" },
          { n: "🔥 最热", v: "hot" },
          { n: "📈 上升最快", v: "rise" },
        ],
      },
    ],
    playlist: [
      {
        key: "lang",
        name: "🌏 语种",
        value: [
          { n: "🌐 全部语种", v: "index" },
          { n: "🇨🇳 华语", v: "huayu" },
          { n: "🌍 欧美", v: "oumei" },
          { n: "🇯🇵 日语", v: "riyu" },
          { n: "🇰🇷 韩语", v: "hanyu" },
          { n: "🇭🇰 粤语", v: "yueyu" },
        ],
      },
      {
        key: "style",
        name: "🎵 风格",
        value: [
          { n: "🎵 流行", v: "liuxing" },
          { n: "🎸 摇滚", v: "yaogun" },
          { n: "🎤 民谣", v: "minyao" },
          { n: "⚡ 电子", v: "dianzi" },
          { n: "💃 舞曲", v: "wuqu" },
          { n: "🎤 说唱", v: "shuochang" },
          { n: "🎹 轻音乐", v: "qingyinle" },
          { n: "🎺 爵士", v: "jueshi" },
          { n: "🌾 乡村", v: "xiangcun" },
          { n: "🎭 R&B/Soul", v: "soul" },
          { n: "🎻 古典", v: "gudian" },
          { n: "🏯 古风", v: "gufeng" },
        ],
      },
    ],
  };

  return { classes, filters };
}

// ==================== 首页推荐 ====================

async function getHomeRecommendList() {
  const $ = await getDOM("/");
  const list = [];
  const seen = new Set();
  homeRecommendCache.clear();

  const pushMusicItem = (href, name, singer, pic, remarks) => {
    const vodId = absUrl(href);
    if (!vodId || seen.has(vodId)) return;
    seen.add(vodId);
    const songId = (href.split("/").pop() || "").replace(".html", "");
    const playUrl = `music://${HOST}/data/down.php?ac=music&id=${songId}`;
    const fullName = singer ? `${singer} - ${name}` : name;
    const item = {
      vod_id: vodId,
      vod_name: cleanText(fullName),
      vod_pic: getImage(pic) || "https://p2.music.126.net/xxx/song.jpg",
      vod_remarks: remarks,
      _type: "song",
      _song_id: songId,
      _play_url: playUrl,
      _singer: singer || "",
      _name: name || "",
    };
    homeRecommendCache.set(vodId, item);
    list.push({
      vod_id: item.vod_id,
      vod_name: item.vod_name,
      vod_pic: item.vod_pic,
      vod_remarks: item.vod_remarks,
    });
  };

  const pushMVItem = (href, name, pic, remarks) => {
    const vodId = absUrl(href);
    if (!vodId || seen.has(vodId)) return;
    seen.add(vodId);
    const mvId = (href.split("/").pop() || "").replace(".html", "");
    const playUrl = `${HOST}/data/down.php?ac=vplay&id=${mvId}&q=1080`;
    const item = {
      vod_id: vodId,
      vod_name: cleanText(name),
      vod_pic: getImage(pic, { isMV: true }) || "https://p2.music.126.net/xxx/mv_default.jpg",
      vod_remarks: remarks,
      _type: "mv",
      _mv_id: mvId,
      _play_url: playUrl,
    };
    homeRecommendCache.set(vodId, item);
    list.push({
      vod_id: item.vod_id,
      vod_name: item.vod_name,
      vod_pic: item.vod_pic,
      vod_remarks: item.vod_remarks,
    });
  };

  $("#datalist li, .lkmusic_list li, .layui-row.lkbj li").each((_, el) => {
    const node = $(el);
    const a = node.find(".name a.url, .name a, a").first();
    const href = a.attr("href") || "";
    if (!href.includes("/mp3/")) return;
    const name = a.text().trim();
    const singer = node.find(".singer, p a, .artist a, .author a").first().text().trim();
    const pic = node.find(".pic img, img").first().attr("src") || "";
    pushMusicItem(href, name, singer, pic, "🎵 正在播放");
  });

  $(".ilingkuplay_list li, .play_list li, .song_list li").each((_, el) => {
    const node = $(el);
    const a = node.find(".name a, a").first();
    const href = a.attr("href") || "";
    if (!href.includes("/mp3/")) return;
    const name = a.text().trim();
    pushMusicItem(href, name, "", "https://p2.music.126.net/xxx/new.jpg", "✨ 新歌推荐");
  });

  $(".video_list li, .ilingku_list li").each((_, el) => {
    const node = $(el);
    const a = node.find(".name a, a").first();
    const href = a.attr("href") || "";
    if (!href.includes("/mp4/")) return;
    const name = a.text().trim();
    const pic = node.find(".pic img, img").first().attr("src") || "";
    pushMVItem(href, name, pic, "🎬 MV推荐");
  });

  logInfo("首页推荐获取完成", { list: list.length, cache: homeRecommendCache.size });
  return list.slice(0, 60);
}

// ==================== 排行榜 ====================

const RANK_LIST = [
  ["rise", "🔥 音乐飙升榜"],
  ["new", "✨ 新歌排行榜"],
  ["original", "🎸 音乐原创榜"],
  ["top", "🎵 Top热歌榜"],
  ["douyin", "🎶 抖音热歌榜"],
  ["kuaishou", "📱 快手热歌榜"],
  ["zwdj", "💃 中文DJ榜"],
  ["hot", "🌐 网络热歌榜"],
  ["japan", "🗾 日本歌曲榜"],
  ["oumei", "🌍 欧美新歌榜"],
  ["korea", "🇰🇷 韩国音乐榜"],
  ["america", "🇺🇸 美国音乐榜"],
  ["acg", "🎮 ACG新歌榜"],
  ["acgyx", "🕹️ ACG游戏榜"],
  ["acgdm", "📺 ACG动画榜"],
  ["omtop", "🌎 欧美热歌榜"],
  ["dian", "⚡ 电子舞曲榜"],
  ["uktop", "🇬🇧 UK排行榜"],
  ["gudian", "🎻 古典音乐榜"],
  ["raptop", "🎤 RAP说唱榜"],
  ["dytop", "🔊 电音热歌榜"],
  ["qianli", "🚀 潜力热歌榜"],
  ["yytop", "🇭🇰 粤语金曲榜"],
  ["ystop", "🎬 影视金曲榜"],
  ["xyztop", "🌏 小语种热歌"],
  ["djtop", "🔄 串烧舞曲榜"],
  ["ktvtop", "🎤 KTV点唱榜"],
  ["chetop", "🚗 车载嗨曲榜"],
  ["aytop", "🌙 熬夜修仙榜"],
  ["sqtop", "😴 睡前放松榜"],
];

// ==================== 五大接口实现 ====================

async function home(params) {
  try {
    const { classes, filters } = getHomeClassesAndFilters();
    const list = await getHomeRecommendList();
    return { class: classes, filters, list };
  } catch (error) {
    logError("首页获取失败", error);
    return { class: [], list: [] };
  }
}

async function category(params) {
  const tid = String(params.categoryId || "");
  const pg = parseInt(params.page || "1", 10) || 1;
  const ext = params.extend || {};

  try {
    if (tid === "home") {
      return { list: await getHomeRecommendList(), page: 1, pagecount: 1, total: 60 };
    }

    if (tid === "rank_list") {
      const start = (pg - 1) * 30;
      const pageData = RANK_LIST.slice(start, start + 30);
      return {
        list: pageData.map(([id, name]) => ({
          vod_id: `rank_${id}`,
          vod_name: name,
          vod_pic: "https://p2.music.126.net/xxx/rank_default.jpg?param=500y500",
          vod_remarks: "📊 点击播放完整榜单",
          style: { type: "rect", ratio: 1.33 },
        })),
        page: pg,
        pagecount: Math.ceil(RANK_LIST.length / 30),
        total: RANK_LIST.length,
      };
    }

    if (tid === "playlist") {
      const lang = ext.lang || "index";
      const style = ext.style || "";
      let url = "/playlists/index.html";
      if (lang !== "index") url = `/playlists/${lang}.html`;
      else if (style) url = `/playlists/${style}.html`;
      if (pg > 1) url = url.replace(/\.html$/, `/${pg}.html`);

      const $ = await getDOM(url);
      const list = [];
      $(".video_list li, .ilingku_list li").each((_, el) => {
        const node = $(el);
        const a = node.find(".name a, a").first();
        const href = a.attr("href") || "";
        if (!href.includes("/playlist/")) return;
        list.push({
          vod_id: absUrl(href),
          vod_name: cleanText(a.text().trim()),
          vod_pic: getImage(node.find(".pic img, img").first().attr("src") || ""),
          vod_remarks: "📀 歌单",
          style: { type: "rect", ratio: 1.33 },
        });
      });
      return { list, page: pg, pagecount: hasNextPage($) ? pg + 1 : pg, total: 9999 };
    }

    if (tid === "singer") {
      const sex = ext.sex || "girl";
      const area = ext.area || "huayu";
      const ch = ext.char || "index";
      let url = "";
      if (ch !== "index") {
        url = pg > 1 ? `/singerlist/${area}/${sex}/${ch}/${pg}.html` : `/singerlist/${area}/${sex}/${ch}.html`;
      } else {
        url = pg > 1 ? `/singerlist/${area}/${sex}/index/${pg}.html` : `/singerlist/${area}/${sex}/index.html`;
      }
      const $ = await getDOM(url);
      const list = [];
      $(".singer_list li").each((_, el) => {
        const node = $(el);
        const picA = node.find(".pic a").first();
        const href = picA.attr("href") || "";
        if (!href) return;
        list.push({
          vod_id: absUrl(href),
          vod_name: cleanText(node.find(".name a").first().text().trim()),
          vod_pic: getImage(node.find("img").first().attr("src") || "", { isSinger: true }),
          vod_remarks: "👤 歌手",
          style: { type: "oval", ratio: 1 },
        });
      });
      return { list, page: pg, pagecount: hasNextPage($) ? pg + 1 : pg, total: 9999 };
    }

    if (tid === "mv") {
      const area = ext.area || "index";
      const type = ext.type || "index";
      const sort = ext.sort || "new";
      const mvUrl = pg === 1 ? `/mvlist/${area}/${type}/${sort}.html` : `/mvlist/${area}/${type}/${sort}/${pg}.html`;
      const $ = await getDOM(mvUrl);
      const list = [];
      $(".video_list li, .play_list li, .ilingku_list li").each((_, el) => {
        const node = $(el);
        const a = node.find(".name a, a.url, a.name, a").first();
        const href = a.attr("href") || "";
        if (!href.includes("/mp4/")) return;
        const rawName = a.text().trim();
        const pic = node.find(".pic img, img").first().attr("src") || "";
        const artist = node.find(".singer a, .artist a, .author a").first().text().trim();
        const mixId = `${absUrl(href)}@@mv@@area=${area}&type=${type}&sort=${sort}&page=${pg}`;
        list.push({
          vod_id: mixId,
          vod_name: cleanSongName(rawName),
          vod_pic: getImage(pic, { isMV: true }) || "https://p2.music.126.net/xxx/mv_default.jpg",
          vod_remarks: artist ? `🎬 MV · ${artist}` : "🎬 MV",
          style: { type: "rect", ratio: 1.78 },
        });
      });
      return { list, page: pg, pagecount: hasNextPage($) ? pg + 1 : pg, total: 9999 };
    }

    return { list: [], page: pg, pagecount: pg, total: 0 };
  } catch (error) {
    logError(`分类获取失败 tid=${tid}`, error);
    return { list: [], page: pg, pagecount: pg, total: 0 };
  }
}

async function search(params) {
  const keyword = (params.keyword || params.wd || "").trim();
  const pg = parseInt(params.page || "1", 10) || 1;
  if (!keyword) return { list: [], page: 1, pagecount: 0, total: 0 };

  try {
    const $ = await getDOM(`/so.php?wd=${encodeURIComponent(keyword)}&page=${pg}`);
    const list = [];
    $(".play_list li, .video_list li").each((_, el) => {
      const node = $(el);
      const a = node.find(".name a, a").first();
      const href = a.attr("href") || "";
      if (!href) return;
      const name = cleanText(a.text().trim());
      const pic = node.find("img").first().attr("src") || "";
      let remarks = "👤 歌手";
      let style = { type: "oval", ratio: 1 };
      if (href.includes("/mp3/")) {
        remarks = "🎵 歌曲";
        style = { type: "rect", ratio: 1.33 };
      } else if (href.includes("/mp4/")) {
        remarks = "🎬 MV";
        style = { type: "rect", ratio: 1.78 };
      } else if (href.includes("/playlist/")) {
        remarks = "📀 歌单";
        style = { type: "rect", ratio: 1.33 };
      }
      list.push({
        vod_id: absUrl(href),
        vod_name: name,
        vod_pic: getImage(pic, { isSinger: remarks === "👤 歌手", isMV: remarks === "🎬 MV" }),
        vod_remarks: remarks,
        style,
      });
    });
    return { list, page: pg, pagecount: hasNextPage($) ? pg + 1 : pg, total: 9999 };
  } catch (error) {
    logError("搜索失败", error);
    return { list: [], page: pg, pagecount: pg, total: 0 };
  }
}

async function detail(params) {
  const rawVideoId = String(params.videoId || "");
  if (!rawVideoId) return { list: [] };

  try {
    // 1) 排行榜详情
    if (rawVideoId.startsWith("rank_")) {
      const rankType = rawVideoId.replace("rank_", "");
      const $ = await getDOM(`/list/${rankType}.html`);
      const episodes = [];
      $(".play_list li").each((_, el) => {
        const a = $(el).find(".name a").first();
        const href = a.attr("href") || "";
        if (!href.includes("/mp3/")) return;
        const songId = (href.split("/").pop() || "").replace(".html", "");
        episodes.push({
          name: cleanSongName(a.text().trim()),
          playId: `music://${HOST}/data/down.php?ac=music&id=${songId}`,
        });
      });
      return {
        list: [
          {
            vod_id: rawVideoId,
            vod_name: `📊 ${rankType}`,
            vod_pic: "https://p2.music.126.net/xxx/rank_default.jpg?param=500y500",
            vod_content: `排行榜：${rankType}，共 ${episodes.length} 首`,
            vod_play_sources: [buildPlaySource("📊 排行榜", episodes)],
          },
        ],
      };
    }

    // 2) MV 分类混合 ID 解析
    let videoId = rawVideoId;
    if (rawVideoId.includes("@@mv@@")) {
      videoId = rawVideoId.split("@@mv@@")[0];
    }

    // 3) 首页缓存命中
    if (homeRecommendCache.has(videoId)) {
      const item = homeRecommendCache.get(videoId);
      const episodes = [{ name: item.vod_name, playId: item._play_url }];
      return {
        list: [
          {
            vod_id: videoId,
            vod_name: item.vod_name,
            vod_pic: item.vod_pic,
            vod_remarks: item.vod_remarks,
            vod_content: `首页推荐 · ${item.vod_name}`,
            vod_actor: item._singer || "",
            vod_play_sources: [buildPlaySource(item._type === "mv" ? "🎬 MV推荐" : "🎵 推荐歌曲", episodes)],
          },
        ],
      };
    }

    // 4) 通用详情页面
    const $ = await getDOM(videoId);
    const title = cleanText($("h1").first().text().trim() || ($("title").first().text() || "").split("_")[0]);
    const pic =
      $(".playhimg img, .djpic img, .video_list .pic img, .pic img")
        .first()
        .attr("src") || "";

    // 歌曲详情
    if (videoId.includes("/mp3/")) {
      const songId = (videoId.split("/").pop() || "").replace(".html", "");
      const singer = $(".play_singer .name a, .singer a, .artist a").first().text().trim();
      const displayName = singer ? `${singer} - ${cleanSongName(title)}` : cleanSongName(title);
      return {
        list: [
          {
            vod_id: videoId,
            vod_name: `🎵 ${cleanSongName(title)}`,
            vod_pic: getImage(pic),
            vod_actor: singer,
            vod_content: `🎵 歌曲 · ${singer || "未知歌手"}`,
            vod_play_sources: [
              buildPlaySource("🎵 歌曲播放列表", [
                {
                  name: displayName,
                  playId: `music://${HOST}/data/down.php?ac=music&id=${songId}`,
                },
              ]),
            ],
          },
        ],
      };
    }

    // MV 详情
    if (videoId.includes("/mp4/")) {
      const mvId = (videoId.split("/").pop() || "").replace(".html", "");
      const singer = $(".play_singer .name a, .singer_info .name a, .artist a").first().text().trim();
      const mvPlayUrl = `${HOST}/data/down.php?ac=vplay&id=${mvId}&q=1080`;
      return {
        list: [
          {
            vod_id: videoId,
            vod_name: `🎬 ${cleanSongName(title)}`,
            vod_pic: getImage(pic, { isMV: true }),
            vod_actor: singer,
            vod_content: `🎬 MV · ${singer || "未知歌手"}`,
            vod_play_sources: [buildPlaySource("🎬 MV播放列表", [{ name: cleanSongName(title), playId: mvPlayUrl }])],
          },
        ],
      };
    }

    // 歌单详情
    if (videoId.includes("/playlist/")) {
      const episodes = [];
      $(".play_list li").each((_, el) => {
        const a = $(el).find(".name a").first();
        const href = a.attr("href") || "";
        if (!href.includes("/mp3/")) return;
        const songId = (href.split("/").pop() || "").replace(".html", "");
        episodes.push({
          name: cleanSongName(a.text().trim()),
          playId: `music://${HOST}/data/down.php?ac=music&id=${songId}`,
        });
      });
      return {
        list: [
          {
            vod_id: videoId,
            vod_name: `📀 ${title}`,
            vod_pic: getImage(pic),
            vod_content: `📀 歌单 · 共 ${episodes.length} 首`,
            vod_play_sources: [buildPlaySource("📀 歌单", episodes)],
          },
        ],
      };
    }

    // 歌手详情
    if (videoId.includes("/singer/")) {
      const episodes = [];
      $(".play_list li").each((_, el) => {
        const a = $(el).find(".name a").first();
        const href = a.attr("href") || "";
        if (!href.includes("/mp3/")) return;
        const songId = (href.split("/").pop() || "").replace(".html", "");
        episodes.push({
          name: cleanSongName(a.text().trim()),
          playId: `music://${HOST}/data/down.php?ac=music&id=${songId}`,
        });
      });
      return {
        list: [
          {
            vod_id: videoId,
            vod_name: `👤 ${title}`,
            vod_pic: getImage(pic, { isSinger: true }),
            vod_content: $(".singer_info .info p").first().text().trim() || "世纪音乐网",
            vod_play_sources: [buildPlaySource(`🎵 歌手歌曲 · ${episodes.length}首`, episodes)],
          },
        ],
      };
    }

    return {
      list: [
        {
          vod_id: videoId,
          vod_name: title || "未知内容",
          vod_pic: getImage(pic),
          vod_content: "世纪音乐网",
          vod_play_sources: [],
        },
      ],
    };
  } catch (error) {
    logError("详情获取失败", error);
    return { list: [] };
  }
}

// ==================== 歌词相关 ====================

function filterLrcAds(lrcText) {
  if (!lrcText) return "";
  const adPatterns = [
    /欢迎访问/i,
    /欢迎来到/i,
    /本站/i,
    /广告/i,
    /QQ群/i,
    /微信/i,
    /www\./i,
    /http/i,
    /\.com/i,
    /\.cn/i,
    /\.net/i,
    /音乐网/i,
    /下载/i,
    /免费/i,
    /版权/i,
    /声明/i,
    /邮箱/i,
    /联系/i,
    /oeecc/i,
    /foxmail/i,
  ];

  return String(lrcText)
    .split(/\r?\n/)
    .filter((line) => {
      if (!line.trim()) return true;
      if (/^\[(ar|ti|al|by|offset|total|length):/i.test(line)) return true;
      if (!/^\[\d{2}:\d{2}/.test(line)) return true;
      return !adPatterns.some((re) => re.test(line));
    })
    .join("\n");
}

async function getLrcBySongId(songId) {
  if (!songId) return "";
  const cacheKey = `lrc_${songId}`;
  if (lrcCache.has(cacheKey)) return lrcCache.get(cacheKey);

  const tryUrls = [
    `${HOST}/down.php?ac=music&lk=txt&id=${songId}`,
    `${HOST}/data/lrc/${songId}.lrc`,
  ];

  for (const url of tryUrls) {
    try {
      const res = await httpClient.get(url, {
        responseType: "arraybuffer",
        headers: { ...DEFAULT_HEADERS, Referer: `${HOST}/` },
      });
      if (res.status !== 200 || !res.data) continue;
      const text = Buffer.from(res.data).toString("utf-8");
      if (/\[\d{2}:\d{2}/.test(text)) {
        const finalLrc = filterLrcAds(text);
        lrcCache.set(cacheKey, finalLrc);
        return finalLrc;
      }
    } catch (_) {
      // 单个源失败不影响继续尝试
    }
  }

  return "";
}

// ==================== 播放接口 ====================

async function play(params) {
  const playId = String(params.playId || "").trim();
  const flag = String(params.flag || "");

  try {
    if (!playId) throw new Error("playId 不能为空");

    let finalUrl = playId;
    let parse = 0;

    // 统一处理 music:// 协议
    if (finalUrl.startsWith("music://")) {
      finalUrl = finalUrl.replace("music://", "");
      if (!/^https?:\/\//i.test(finalUrl)) finalUrl = `https://${finalUrl}`;
    }

    // 如果是详情页地址，转换成直链
    if (finalUrl.includes("/mp3/")) {
      const songId = (finalUrl.split("/").pop() || "").replace(".html", "");
      finalUrl = `${HOST}/data/down.php?ac=music&id=${songId}`;
    } else if (finalUrl.includes("/mp4/")) {
      const mvId = (finalUrl.split("/").pop() || "").replace(".html", "");
      finalUrl = `${HOST}/data/down.php?ac=vplay&id=${mvId}&q=1080`;
    }

    // 常见直链后缀可直接播放
    if (/\.(m3u8|mp4|mp3|flv|wav|aac|ogg|m4a)(\?|$)/i.test(finalUrl)) {
      parse = 0;
    }

    // 歌词增强：仅歌曲尝试加载
    let lrc = "";
    if (/ac=music/i.test(finalUrl)) {
      const match = /[?&]id=([^&]+)/i.exec(finalUrl);
      const songId = match ? match[1] : "";
      lrc = await getLrcBySongId(songId);
    }

    return {
      urls: [{ name: "播放", url: finalUrl }],
      parse,
      flag,
      header: {
        "User-Agent": DEFAULT_HEADERS["User-Agent"],
        Referer: `${HOST}/`,
      },
      ...(lrc ? { lrc } : {}),
    };
  } catch (error) {
    logError("播放失败", error);
    return {
      urls: [],
      parse: 0,
      flag,
      header: {},
    };
  }
}

// ==================== 导出与运行 ====================

module.exports = {
  home,
  category,
  search,
  detail,
  play,
};

const runner = require("spider_runner");
runner.run(module.exports);

