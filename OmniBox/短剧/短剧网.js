// @name 短剧网
// @author https://github.com/hjdhnx/drpy-node/blob/main/spider/js/%E7%9F%AD%E5%89%A7%E7%BD%91%5B%E7%9B%98%5D.js
// @description 刮削：不支持，弹幕：不支持，嗅探：不支持（网盘直连）
// @dependencies: axios, cheerio
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/短剧/短剧网.js

/**
 * ============================================================================
 * 短剧网[盘] - OmniBox 爬虫脚本（新格式）
 * ============================================================================
 * 数据来源: https://sm3.cc
 * 核心能力:
 *   - 首页/分类列表
 *   - 搜索
 *   - 详情（提取网盘分享链接并展开视频文件）
 *   - 播放（调用 OmniBox 网盘直连能力）
 * 说明:
 *   - 本站主要提供网盘链接
 *   - 不走 push:// 推送，直接按网盘文件播放
 * ============================================================================
 */

const axios = require("axios");
const cheerio = require("cheerio");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ==========
const siteConfig = {
    host: "https://sm3.cc",
    timeout: 12000,
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://sm3.cc/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
    },
    classes: [
        { type_id: "1", type_name: "短剧大全" },
        { type_id: "2", type_name: "更新短剧" }
    ]
};

const axiosInstance = axios.create({
    timeout: siteConfig.timeout,
    headers: siteConfig.headers,
    validateStatus: (status) => status >= 200 && status < 500
});

// ========== 日志工具 ==========
const logInfo = (message, data = null) => {
    if (data !== null && data !== undefined) {
        OmniBox.log("info", `[短剧网盘] ${message}: ${JSON.stringify(data)}`);
    } else {
        OmniBox.log("info", `[短剧网盘] ${message}`);
    }
};

const logError = (message, error) => {
    OmniBox.log("error", `[短剧网盘] ${message}: ${error?.message || error}`);
};

// ========== 工具函数 ==========

/**
 * 标准化 URL（补全相对路径）
 */
const fixUrl = (url) => {
    if (!url) return "";
    const u = String(url).trim();
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    if (u.startsWith("//")) return `https:${u}`;
    return u.startsWith("/") ? `${siteConfig.host}${u}` : `${siteConfig.host}/${u}`;
};

/**
 * 识别主流网盘分享链接
 */
const isPanUrl = (url) => {
    if (!url) return false;
    const u = String(url).toLowerCase();
    return u.includes("pan.baidu.com") || u.includes("quark.cn") || u.includes("pan.quark.cn") || u.includes("drive.uc.cn") || u.includes("aliyundrive.com") || u.includes("alipan.com") || u.includes("xunlei.com") || u.includes("cloud.189.cn") || u.includes("115.com") || u.includes("123pan.com");
};

/**
 * 去掉 push:// 或 push: 前缀，得到纯分享地址
 */
const normalizeShareUrl = (url) => {
    if (!url) return "";
    let value = String(url).trim();
    if (value.startsWith("push://")) value = value.slice("push://".length);
    if (value.startsWith("push:")) value = value.slice("push:".length);
    return value.trim();
};

/**
 * 请求 HTML 文本
 */
const requestHtml = async (url) => {
    try {
        const finalUrl = fixUrl(url);
        const res = await axiosInstance.get(finalUrl);
        if (res.status >= 400) {
            logInfo("请求返回异常状态码", { url: finalUrl, status: res.status });
        }
        return typeof res.data === "string" ? res.data : "";
    } catch (error) {
        logError(`请求失败: ${url}`, error);
        return "";
    }
};

/**
 * 提取条目列表（首页/分类/搜索共用）
 */
const parseCardList = ($) => {
    const list = [];
    const cards = $("li.col-6");

    cards.each((_, element) => {
        const $card = $(element);
        const $link = $card.find("h3.f-14 a");

        const href = fixUrl($link.attr("href") || "");
        const title = ($link.text() || "").trim() || ($link.attr("title") || "").trim();
        const titleAttr = ($link.attr("title") || "").trim();
        const image = fixUrl($card.find("img.lazy").attr("data-original") || "");

        if (!href || !title) return;

        const remarks = titleAttr
            ? titleAttr.replace(/^[^（]*（/, "").replace(/）$/, "")
            : "";

        list.push({
            vod_id: href,
            vod_name: title,
            vod_pic: image,
            vod_remarks: remarks,
            vod_content: ""
        });
    });

    return list;
};

/**
 * 从详情页提取网盘分享链接
 */
const parseShareUrls = ($) => {
    const urls = [];
    const seen = new Set();

    $(".content p a, .content a").each((_, link) => {
        const href = normalizeShareUrl($(link).attr("href") || "");
        if (!href || !isPanUrl(href)) return;
        if (seen.has(href)) return;
        seen.add(href);
        urls.push(href);
    });

    return urls;
};

/**
 * 判断是否视频文件
 */
const isVideoFile = (file) => {
    if (!file || !file.file_name) return false;
    const fileName = String(file.file_name).toLowerCase();
    const videoExt = [".mp4", ".mkv", ".avi", ".flv", ".mov", ".wmv", ".m3u8", ".ts", ".webm", ".m4v"];
    for (const ext of videoExt) {
        if (fileName.endsWith(ext)) return true;
    }
    if (file.format_type) {
        const formatType = String(file.format_type).toLowerCase();
        if (formatType.includes("video") || formatType.includes("mpeg") || formatType.includes("h264")) return true;
    }
    return false;
};

const getFileId = (file) => file?.fid || file?.file_id || "";
const getFileName = (file) => file?.file_name || file?.name || "";

/**
 * 递归获取分享中的全部视频文件
 */
const getAllVideoFiles = async (shareURL, files) => {
    const videos = [];
    for (const file of files || []) {
        if (file.file && isVideoFile(file)) {
            videos.push(file);
        } else if (file.dir) {
            const subFileId = getFileId(file);
            if (!subFileId) continue;
            try {
                const sub = await OmniBox.getDriveFileList(shareURL, subFileId);
                if (Array.isArray(sub?.files) && sub.files.length > 0) {
                    const subVideos = await getAllVideoFiles(shareURL, sub.files);
                    videos.push(...subVideos);
                }
            } catch (error) {
                logInfo("读取子目录失败", { shareURL, fileId: subFileId, error: error?.message || String(error) });
            }
        }
    }
    return videos;
};

const panShareCache = new Map();

/**
 * 加载网盘文件（带缓存）
 */
const loadPanFiles = async (shareURL) => {
    if (!shareURL) return null;
    if (panShareCache.has(shareURL)) return panShareCache.get(shareURL);

    try {
        const driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
        const fileList = await OmniBox.getDriveFileList(shareURL, "0");
        const rootFiles = Array.isArray(fileList?.files) ? fileList.files : [];
        const videos = await getAllVideoFiles(shareURL, rootFiles);
        const data = { driveInfo, videos };
        panShareCache.set(shareURL, data);
        return data;
    } catch (error) {
        logError("读取网盘文件失败", error);
        return null;
    }
};

/**
 * 按网盘类型给播放源命名，重复类型自动编号
 */
const buildPanSourceNames = async (shareUrls) => {
    const rawNames = [];
    for (const shareURL of shareUrls) {
        try {
            const info = await OmniBox.getDriveInfoByShareURL(shareURL);
            rawNames.push(info?.displayName || "网盘");
        } catch {
            rawNames.push("网盘");
        }
    }

    const countMap = {};
    for (const name of rawNames) {
        countMap[name] = (countMap[name] || 0) + 1;
    }

    const indexMap = {};
    return rawNames.map((name) => {
        if ((countMap[name] || 0) <= 1) return name;
        indexMap[name] = (indexMap[name] || 0) + 1;
        return `${name}${indexMap[name]}`;
    });
};

// ========== 核心接口 ==========

/**
 * 首页
 * 返回固定分类 + 默认分类第一页列表
 */
async function home() {
    logInfo("进入首页");
    const list = await getCategoryList("1", 1);

    return {
        class: siteConfig.classes,
        list: list.list,
        page: 1,
        pagecount: list.pagecount
    };
}

/**
 * 分类
 */
async function category(params) {
    const categoryId = String(params?.categoryId || "1");
    const page = parseInt(params?.page, 10) || 1;
    logInfo("请求分类", { categoryId, page });
    return await getCategoryList(categoryId, page);
}

/**
 * 搜索
 */
async function search(params) {
    const keyword = (params?.keyword || params?.wd || "").trim();
    const page = parseInt(params?.page, 10) || 1;

    if (!keyword) {
        return { list: [], page: 1, pagecount: 0 };
    }

    logInfo("搜索关键词", { keyword, page });

    const url = `${siteConfig.host}/search.php?q=${encodeURIComponent(keyword)}&page=${page}`;
    const html = await requestHtml(url);
    if (!html) {
        return { list: [], page, pagecount: page };
    }

    const $ = cheerio.load(html);
    const list = parseCardList($);
    logInfo("搜索结果数量", list.length);

    return {
        list,
        page,
        pagecount: list.length > 0 ? page + 1 : page
    };
}

/**
 * 详情
 */
async function detail(params) {
    const videoId = params?.videoId || "";
    const url = fixUrl(videoId);

    if (!url) {
        return { list: [] };
    }

    logInfo("请求详情", { videoId: url });

    try {
        const html = await requestHtml(url);
        if (!html) return { list: [] };

        const $ = cheerio.load(html);
        const titleRaw = ($("title").text() || "").trim();
        const title = titleRaw.split("（")[0].trim() || titleRaw || "短剧";
        const pic = $(".tx-text img").attr("src");

        const shareUrls = parseShareUrls($);
        logInfo("提取网盘链接完成", { count: shareUrls.length, shareUrls });

        const sourceNames = await buildPanSourceNames(shareUrls);
        const playSources = [];

        for (let i = 0; i < shareUrls.length; i += 1) {
            const shareURL = shareUrls[i];
            const sourceName = sourceNames[i] || `网盘${i + 1}`;
            const panInfo = await loadPanFiles(shareURL);
            const files = panInfo?.videos || [];

            const episodes = [];
            if (files.length > 0) {
                for (const file of files) {
                    const fileId = getFileId(file);
                    if (!fileId) continue;
                    const fileName = getFileName(file) || `网盘资源${episodes.length + 1}`;
                    episodes.push({
                        name: fileName,
                        playId: `${shareURL}|${fileId}`
                    });
                }
            } else {
                episodes.push({
                    name: "网盘资源",
                    playId: shareURL
                });
            }

            if (episodes.length > 0) {
                playSources.push({
                    name: sourceName,
                    episodes
                });
            }
        }

        logInfo("详情解析完成", { title, sourceCount: playSources.length });

        const vod = {
            vod_id: videoId,
            vod_name: title,
            vod_pic: pic,
            vod_content: $(".tx-text h1").text() || "此规则为网盘直连模式，播放时直接调用 OmniBox 网盘能力。",
            vod_play_sources: playSources
        };

        return { list: [vod] };
    } catch (error) {
        logError("详情解析失败", error);
        return { list: [] };
    }
}

/**
 * 播放
 * 直接调用 OmniBox 网盘播放接口
 */
async function play(params) {
    const playId = (params?.playId || "").trim();
    const flag = params?.flag || "";

    if (!playId) {
        return { urls: [], parse: 0, header: {} };
    }

    try {
        // 标准网盘文件播放ID：shareURL|fileId
        if (playId.includes("|")) {
            const [rawShareURL, fileId] = playId.split("|");
            const shareURL = normalizeShareUrl(rawShareURL);
            if (shareURL && fileId) {
                const playInfo = await OmniBox.getDriveVideoPlayInfo(shareURL, fileId, flag || "");
                const urls = Array.isArray(playInfo?.url)
                    ? playInfo.url.map((item) => ({ name: item.name || "播放", url: item.url }))
                    : [];
                logInfo("网盘播放成功", { shareURL, fileId, lineCount: urls.length });
                return {
                    urls,
                    flag: shareURL,
                    header: playInfo?.header || {},
                    parse: 0,
                    danmaku: playInfo?.danmaku || []
                };
            }
        }

        // 兜底：如果只有分享链接，尝试取首个视频文件播放
        const shareURL = normalizeShareUrl(playId);
        if (isPanUrl(shareURL)) {
            const panInfo = await loadPanFiles(shareURL);
            const files = panInfo?.videos || [];
            const firstFile = files[0];
            const fileId = getFileId(firstFile);

            if (fileId) {
                const playInfo = await OmniBox.getDriveVideoPlayInfo(shareURL, fileId, flag || "");
                const urls = Array.isArray(playInfo?.url)
                    ? playInfo.url.map((item) => ({ name: item.name || "播放", url: item.url }))
                    : [];
                logInfo("分享链接兜底播放成功", { shareURL, fileId, lineCount: urls.length });
                return {
                    urls,
                    flag: shareURL,
                    header: playInfo?.header || {},
                    parse: 0,
                    danmaku: playInfo?.danmaku || []
                };
            }
        }

        logInfo("播放失败，未识别有效网盘播放ID", { playId });
        return { urls: [], parse: 1, header: {} };
    } catch (error) {
        logError("播放解析失败", error);
        return { urls: [], parse: 1, header: {} };
    }
}

// ========== 内部实现 ==========

/**
 * 分类列表抓取
 */
const getCategoryList = async (categoryId, page) => {
    try {
        const pg = parseInt(page, 10) || 1;
        const cid = String(categoryId || "1");
        const url = `${siteConfig.host}/?cate=${encodeURIComponent(cid)}&page=${pg}`;

        const html = await requestHtml(url);
        if (!html) {
            return { list: [], page: pg, pagecount: pg };
        }

        const $ = cheerio.load(html);
        const list = parseCardList($);

        logInfo("分类解析完成", { categoryId: cid, page: pg, count: list.length });

        return {
            list,
            page: pg,
            pagecount: list.length > 0 ? pg + 1 : pg
        };
    } catch (error) {
        logError("分类解析失败", error);
        return { list: [], page: 1, pagecount: 1 };
    }
};

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);
