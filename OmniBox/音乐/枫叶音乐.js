// @name 枫叶音乐
// @author 
// @description 
// @dependencies: axios
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/音乐/枫叶音乐.js

/**
 * ============================================================================
 * 枫叶音乐 - OmniBox 爬虫脚本
 * ============================================================================
 */
const axios = require("axios");
const http = require("http");
const https = require("https");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ==========
const host = 'https://fy-musicbox-api.mu-jie.cc';
const def_headers = {
    "Host": "fy-musicbox-api.mu-jie.cc",
    "Connection": "keep-alive",
    "Pragma": "no-cache",
    "Cache-Control": "no-cache",
    "sec-ch-ua-platform": '"Windows"',
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
    "sec-ch-ua": '"Microsoft Edge";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
    "sec-ch-ua-mobile": "?0",
    "Accept": "*/*",
    "Origin": "https://mu-jie.cc",
    "Sec-Fetch-Site": "same-site",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "Referer": "https://mu-jie.cc/",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6"
};

const axiosInstance = axios.create({
    timeout: 15000,
    httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
    httpAgent: new http.Agent({ keepAlive: true })
});

/**
 * 日志工具函数
 */
const logInfo = (message, data = null) => {
    const output = data ? `${message}: ${JSON.stringify(data)}` : message;
    OmniBox.log("info", `[枫叶音乐] ${output}`);
};

const logError = (message, error) => {
    OmniBox.log("error", `[枫叶音乐] ${message}: ${error.message || error}`);
};

/**
 * 首页 - 返回音乐分类
 */
async function home(params) {
    logInfo("进入首页，获取分类");
    try {
        const url = `${host}/getPlaylistCategory`;
        const response = await axiosInstance.get(url, { headers: def_headers });
        const data = response.data;

        const classes = [];
        if (data && Array.isArray(data) && data.length > 0) {
            const categories = data[0].category;
            
            for (const category of categories) {
                if (category.sub && Array.isArray(category.sub)) {
                    for (const subCategory of category.sub) {
                        classes.push({
                            type_id: subCategory.name || '',
                            type_name: subCategory.name || ''
                        });
                    }
                }
            }
        }

        logInfo("分类获取成功", { count: classes.length });
        return {
            class: classes,
            list: []
        };
    } catch (e) {
        logError("获取分类失败", e);
        return { class: [], list: [] };
    }
}

/**
 * 分类列表 - 获取歌单或歌曲列表
 */
async function category(params) {
    const { categoryId, page } = params;
    const pg = parseInt(page) || 1;
    logInfo(`请求分类: ${categoryId}, 页码: ${pg}`);

    try {
        // 判断是否为歌单ID（包含@符号）
        if (categoryId.includes('@')) {
            // 获取歌单内的歌曲列表
            const playlistId = categoryId.split('@')[0];
            const url = `${host}/meting/?server=netease&type=playlist&id=${playlistId}`;
            const response = await axiosInstance.get(url, { headers: def_headers });
            const data = response.data;

            const list = [];
            if (data && data.tracks && Array.isArray(data.tracks)) {
                data.tracks.forEach(track => {
                    list.push({
                        vod_id: track.url || '',
                        vod_name: track.name || '',
                        vod_pic: track.pic || '',
                        vod_remarks: track.artist || '',
                        vod_tag: 'music'
                    });
                });
            }

            logInfo("歌单歌曲获取成功", { count: list.length });
            return {
                list: list,
                page: pg,
                pagecount: 1
            };
        } else {
            // 获取分类下的歌单列表
            const url = `${host}/netease/playlist/category?type=${categoryId}&limit=60`;
            const response = await axiosInstance.get(url, { headers: def_headers });
            const data = response.data;

            const list = [];
            if (data && Array.isArray(data)) {
                data.forEach(playlist => {
                    list.push({
                        vod_id: `${playlist.id}@`,
                        vod_name: playlist.name || '',
                        vod_pic: playlist.coverImgUrl || '',
                        vod_remarks: `${playlist.playCount || 0} 播放量`,
                        vod_tag: 'folder'
                    });
                });
            }

            logInfo("歌单列表获取成功", { count: list.length });
            return {
                list: list,
                page: pg,
                pagecount: 1
            };
        }
    } catch (e) {
        logError("分类请求失败", e);
        return { list: [], page: pg, pagecount: 1 };
    }
}

/**
 * 搜索
 */
async function search(params) {
    const wd = params.keyword || params.wd || "";
    const pg = parseInt(params.page) || 1;
    logInfo(`搜索关键词: ${wd}, 页码: ${pg}`);

    try {
        const url = `${host}/netease/search/song/?keywords=${encodeURIComponent(wd)}&pn=${pg}&limit=20`;
        const response = await axiosInstance.get(url, { headers: def_headers });
        const data = response.data;

        const list = [];
        if (data && Array.isArray(data)) {
            data.forEach(song => {
                list.push({
                    vod_id: song.url || '',
                    vod_name: song.name || '',
                    vod_pic: song.pic || '',
                    vod_remarks: song.artist || '',
                    vod_tag: 'music'
                });
            });
        }

        logInfo("搜索成功", { count: list.length });
        return {
            list: list,
            page: pg,
            pagecount: 9999
        };
    } catch (e) {
        logError("搜索失败", e);
        return { list: [], page: pg, pagecount: 1 };
    }
}

/**
 * 详情 - 音乐详情
 */
async function detail(params) {
    const videoId = params.videoId;
    logInfo(`请求详情 ID: ${videoId}`);

    try {
        // 音乐直接使用URL作为播放源
        const playSources = [{
            name: '音乐专线',
            episodes: [{
                name: '播放',
                playId: videoId
            }]
        }];

        return {
            list: [{
                vod_id: videoId,
                vod_name: '音乐播放',
                vod_pic: '',
                vod_content: '点击播放音乐',
                vod_play_sources: playSources
            }]
        };
    } catch (e) {
        logError("详情获取失败", e);
        return { list: [] };
    }
}

/**
 * 播放 - 获取真实播放地址
 */
async function play(params) {
    const playId = params.playId;
    logInfo(`准备播放 ID: ${playId}`);

    let finalUrl = playId;

    try {
        // 获取重定向后的真实URL
        const response = await axiosInstance.get(playId, {
            headers: def_headers,
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status < 400;
            }
        });

        if (response.headers.location) {
            finalUrl = response.headers.location;
            logInfo("获取到重定向地址", { url: finalUrl });
        }
    } catch (e) {
        logError("获取播放地址失败，使用原始URL", e);
    }

    logInfo(`最终播放地址: ${finalUrl}`);

    return {
        urls: [{ name: "音乐专线", url: finalUrl }],
        parse: 0,
        header: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36'
        }
    };
}

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);