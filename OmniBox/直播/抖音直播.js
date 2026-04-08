// @name 抖音直播
// @author 
// @description 
// @dependencies: axios, crypto
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/直播/抖音直播.js

/**
 * ============================================================================
 * 抖音直播 - OmniBox 爬虫脚本
 * ============================================================================
 */
const axios = require('axios');
const https = require('https');
const crypto = require('crypto');
const OmniBox = require('omnibox_sdk');

// ========== 全局配置 ==========
const host = 'https://live.douyin.com';
const axiosInstance = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 15000
});

let cookieCache = '';

/**
 * 日志工具函数
 */
const logInfo = (message, data = null) => {
    const output = data ? `${message}: ${JSON.stringify(data)}` : message;
    OmniBox.log("info", `[抖音直播] ${output}`);
};

const logError = (message, error) => {
    OmniBox.log("error", `[抖音直播] ${message}: ${error.message || error}`);
};

// ========== 工具函数 ==========
// 获取Cookie
const getCookie = async () => {
    if (cookieCache) return cookieCache;
    
    try {
        const res = await axiosInstance.get(host);
        const cookies = res.headers['set-cookie'];
        if (cookies && cookies.length > 0) {
            const regex = /ttwid=([^;]+)/;
            const match = cookies[0].match(regex);
            if (match) {
                cookieCache = match[0];
                logInfo('Cookie获取成功');
            }
        }
    } catch (e) {
        logError('获取cookie失败', e);
    }
    return cookieCache;
};

// 获取请求头(带Cookie)
const getHeaders = async () => {
    const cookie = await getCookie();
    return {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': host,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9'
    };
};

// 生成随机设备ID
const generateDeviceId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}${random}`;
};

const firstNonEmpty = (...values) => values.find(v => v !== undefined && v !== null && v !== '');

const parseRawLiveData = (item) => {
    if (!item || typeof item !== 'object') return null;
    
    const candidates = [
        item?.lives?.rawdata,
        item?.lives?.raw_data,
        item?.live?.rawdata,
        item?.live_info?.rawdata,
        item?.aweme_info?.live_info?.rawdata,
        item?.data?.rawdata,
        item?.rawdata,
        item?.lives,
        item?.live,
        item?.live_info,
        item?.aweme_info?.live_info,
        item?.aweme_info,
        item?.data,
        item
    ];
    
    for (const candidate of candidates) {
        if (!candidate) continue;
        
        if (typeof candidate === 'string') {
            try {
                const parsed = JSON.parse(candidate);
                if (parsed && typeof parsed === 'object') return parsed;
            } catch (_) {
                // ignore invalid json
            }
            continue;
        }
        
        if (typeof candidate === 'object') {
            return candidate;
        }
    }
    
    return null;
};

const normalizeSearchItem = (raw, fallback = {}) => {
    if (!raw || typeof raw !== 'object') return null;
    
    const roomId = firstNonEmpty(
        raw?.id_str,
        raw?.room_id_str,
        raw?.room?.id_str,
        raw?.room?.id,
        raw?.room_id,
        raw?.roomId
    );
    if (!roomId) return null;
    
    const webRid = firstNonEmpty(
        raw?.owner?.web_rid,
        raw?.web_rid,
        raw?.room?.owner?.web_rid
    ) || generateDeviceId();
    
    const nickname = firstNonEmpty(
        raw?.owner?.nickname,
        raw?.nickname,
        raw?.room?.owner?.nickname,
        fallback?.nickname
    ) || '抖音直播';
    
    const title = firstNonEmpty(
        raw?.title,
        raw?.room?.title,
        fallback?.title,
        nickname
    );
    
    const vodPic = firstNonEmpty(
        raw?.owner?.avatar_large?.url_list?.[0],
        raw?.room?.cover?.url_list?.[0],
        raw?.cover?.url_list?.[0],
        raw?.cover_url
    ) || '';
    
    const onlineText = firstNonEmpty(
        raw?.room?.stats?.user_count_str,
        raw?.user_count_str,
        raw?.room?.user_count_str,
        raw?.user_count
    );
    const tagText = firstNonEmpty(
        raw?.video_feed_tag,
        raw?.room?.partition_road_map?.[0]?.title,
        raw?.partition?.title,
        fallback?.tag
    );
    const remark = [tagText, onlineText].filter(Boolean).join(' ');
    
    return {
        vod_id: `${webRid}@@${roomId}`,
        vod_name: nickname,
        vod_pic: vodPic,
        vod_remarks: remark,
        vod_content: title
    };
};

const extractSearchVideos = (payload) => {
    const list = [];
    const seen = new Set();
    const source = Array.isArray(payload) ? payload : [];
    
    for (const item of source) {
        const raw = parseRawLiveData(item);
        const normalized = normalizeSearchItem(raw, {
            nickname: item?.nickname,
            title: item?.title || item?.desc,
            tag: item?.search_keyword
        });
        if (!normalized) continue;
        if (seen.has(normalized.vod_id)) continue;
        seen.add(normalized.vod_id);
        list.push(normalized);
    }
    
    return list;
};

// ========== 核心功能函数（OmniBox格式）==========

/**
 * 首页 - 返回分类
 */
async function home(params) {
    logInfo('进入首页');
    
    // 预先获取Cookie
    await getCookie();
    
    return {
        class: [
            { type_id: '10000$3', type_name: '娱乐天地' },
            { type_id: '10001$3', type_name: '科技文化' },
            { type_id: '102$4', type_name: '音乐' },
            { type_id: '103$4', type_name: '游戏' },
            { type_id: '105$4', type_name: '舞蹈' },
            { type_id: '101$4', type_name: '聊天' },
            { type_id: '108$4', type_name: '运动' },
            { type_id: '107$4', type_name: '生活' },
            { type_id: '106$4', type_name: '文化' },
            { type_id: '104$4', type_name: '二次元' },
        ],
        list: []
    };
}

/**
 * 分类列表
 */
async function category(params) {
    const categoryId = params.categoryId;
    const pg = parseInt(params.page) || 1;
    const offset = 15 * (pg - 1);
    const [partition, type] = categoryId.split('$');
    
    logInfo(`请求分类: ${categoryId}, 页码: ${pg}`);
    
    // Web API参数
    const webUrl = `https://live.douyin.com/webcast/web/partition/detail/room/v2/`;
    const webParams = {
        aid: '6383',
        app_name: 'douyin_web',
        live_id: 1,
        device_platform: 'web',
        language: 'zh-CN',
        browser_language: 'zh-CN',
        browser_platform: 'Win32',
        browser_name: 'Chrome',
        browser_version: '120.0.0.0',
        partition: partition,
        partition_type: type,
        count: 15,
        offset: offset,
        web_rid: generateDeviceId(),
        cookie_enabled: true,
        screen_width: 1920,
        screen_height: 1080
    };
    
    const headers = await getHeaders();
    
    // 重试机制
    const strategies = [
        // 策略1: Web API(带Cookie)
        async () => {
            const url = webUrl + '?' + new URLSearchParams(webParams).toString();
            const res = await axiosInstance.get(url, {
                headers,
                validateStatus: (status) => status < 500
            });
            return res.data;
        },
        // 策略2: 备用域名
        async () => {
            const backupUrl = webUrl.replace('live.douyin.com', 'webcast.amemv.com');
            const url = backupUrl + '?' + new URLSearchParams(webParams).toString();
            const res = await axiosInstance.get(url, {
                headers,
                validateStatus: (status) => status < 500
            });
            return res.data;
        }
    ];
    
    for (let i = 0; i < strategies.length; i++) {
        try {
            logInfo(`尝试策略 ${i + 1}`);
            const data = await strategies[i]();
            
            if (!data || data.status_code !== 0) {
                logInfo(`策略 ${i + 1} 返回错误: ${data?.status_msg || '未知错误'}`);
                continue;
            }
            
            if (!data.data || !data.data.data) {
                logInfo(`分类${categoryId} 第${pg}页 无数据`);
                return { list: [], page: pg, pagecount: 0 };
            }
            
            const list = data.data.data.map(it => ({
                vod_id: `${it.web_rid || generateDeviceId()}@@${it.room.id_str}`,
                vod_name: it.room.title,
                vod_pic: it.room.cover.url_list[0],
                vod_remarks: `${it.room.owner.nickname} (🔥${it.room.stats.user_count_str})`
            }));
            
            logInfo(`策略 ${i + 1} 成功: ${list.length}条`);
            return {
                list,
                page: pg,
                pagecount: pg + 1
            };
        } catch (e) {
            logError(`策略 ${i + 1} 失败`, e);
            if (i === strategies.length - 1) {
                return { list: [], page: pg, pagecount: 0 };
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    return { list: [], page: pg, pagecount: 0 };
}

/**
 * 详情页
 */
async function detail(params) {
    const videoId = params.videoId;
    const idStr = Array.isArray(videoId) ? videoId[0] : videoId;
    const [web_rid, room_id_str] = idStr.split('@@');
    
    logInfo(`请求详情 ID: ${videoId}`);
    
    const url = `https://live.douyin.com/webcast/room/web/enter/?aid=6383&app_name=douyin_web&live_id=1&device_platform=web&enter_from=web_live&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=120.0.0.0&web_rid=${web_rid}&room_id_str=${room_id_str}&enter_source=&is_need_double_stream=false`;
    
    const headers = await getHeaders();
    
    try {
        const res = await axiosInstance.get(url, { headers });
        const data = res.data;
        
        if (!data.data || !data.data.data || data.data.data.length === 0) {
            logError('直播间数据为空', new Error('No data'));
            return { list: [] };
        }
        
        const info = data.data.data[0];
        
        const resolutionName = {
            "FULL_HD1": "蓝光",
            "HD1": "超清",
            "ORIGION": "原画",
            "SD1": "标清",
            "SD2": "高清"
        };
        
        // 提取播放URL
        const flvUrls = Object.entries(info.stream_url.flv_pull_url || {})
            .map(([key, value]) => `${resolutionName[key] || key}$${value}`)
            .join('#');
        
        const hlsUrls = Object.entries(info.stream_url.hls_pull_url_map || {})
            .map(([key, value]) => `${resolutionName[key] || key}$${value}`)
            .join('#');
        
        // 解析播放源为OmniBox格式
        const playSources = [];
        
        if (flvUrls) {
            const flvEpisodes = flvUrls.split('#').map(item => {
                const [name, playId] = item.split('$');
                return { name: name || '正片', playId: playId || name };
            });
            playSources.push({ name: 'FLV', episodes: flvEpisodes });
        }
        
        if (hlsUrls) {
            const hlsEpisodes = hlsUrls.split('#').map(item => {
                const [name, playId] = item.split('$');
                return { name: name || '正片', playId: playId || name };
            });
            playSources.push({ name: 'HLS', episodes: hlsEpisodes });
        }
        
        const video = {
            vod_id: idStr,
            vod_name: info.title,
            vod_pic: info.cover.url_list[0],
            vod_actor: info.owner.nickname,
            vod_content: info.title,
            vod_play_sources: playSources
        };
        
        logInfo('详情获取成功', { vod_id: video.vod_id });
        return { list: [video] };
    } catch (e) {
        logError('详情获取失败', e);
        return { list: [] };
    }
}

/**
 * 搜索
 */
async function search(params) {
    const keyword = params.keyword || params.wd || '';
    const pg = parseInt(params.page) || 1;
    
    if (!keyword.trim()) {
        return { list: [], page: pg };
    }
    
    const offset = 20 * (pg - 1);
    
    logInfo(`搜索关键词: ${keyword}, 页码: ${pg}`);
    
    const headers = await getHeaders();
    headers.referer = `https://www.douyin.com/search/${encodeURIComponent(keyword)}?source=switch_tab&type=live`;
    
    try {
        const primaryParams = {
            device_platform: 'webapp',
            aid: '6383',
            channel: 'channel_pc_web',
            search_channel: 'aweme_live',
            search_source: 'switch_tab',
            query_correct_type: 1,
            need_filter_settings: 1,
            list_type: 'single',
            keyword,
            offset,
            count: 20,
            os_version: 10
        };
        
        const fallbackParams = {
            device_platform: 'webapp',
            aid: '6383',
            channel: 'channel_pc_web',
            search_channel: 'aweme_live',
            keyword,
            offset,
            count: 20,
            os_version: 10
        };
        
        const strategies = [
            {
                name: 'live/search',
                url: `https://www.douyin.com/aweme/v1/web/live/search/?${new URLSearchParams(primaryParams).toString()}`
            },
            {
                name: 'general/search/stream',
                url: `https://www.douyin.com/aweme/v1/web/general/search/stream/?${new URLSearchParams(fallbackParams).toString()}`
            }
        ];
        
        for (const strategy of strategies) {
            try {
                const res = await axiosInstance.get(strategy.url, {
                    headers,
                    validateStatus: (status) => status < 500
                });
                const data = res.data || {};
                const list = extractSearchVideos(data.data);
                if (list.length > 0) {
                    logInfo(`搜索策略 ${strategy.name} 命中: ${list.length}条`);
                    return { list, page: pg };
                }
                
                if (data.search_nil_info?.search_nil_type === 'verify_check') {
                    logInfo(`搜索策略 ${strategy.name} 触发风控 verify_check,准备降级分区搜索`);
                    break;
                }
            } catch (e) {
                logError(`搜索策略 ${strategy.name} 失败`, e);
            }
        }
        
        // 降级:按分区搜索关键词
        const partitionUrl = `https://live.douyin.com/webcast/web/partition/search/?keyword=${encodeURIComponent(keyword)}&aid=6383`;
        const partitionRes = await axiosInstance.get(partitionUrl, {
            headers,
            validateStatus: (status) => status < 500
        });
        const partitionData = partitionRes.data || {};
        const partitions = Array.isArray(partitionData?.data?.SearchResult) ? partitionData.data.SearchResult : [];
        if (partitions.length === 0) {
            return { list: [], page: pg };
        }
        
        const merged = [];
        const seen = new Set();
        const maxPartitions = Math.min(3, partitions.length);
        for (let i = 0; i < maxPartitions; i++) {
            const partition = partitions[i]?.partition;
            const partitionId = partition?.id_str;
            const partitionType = partition?.type;
            if (!partitionId || partitionType === undefined || partitionType === null) continue;
            
            try {
                const categoryRet = await category({ 
                    categoryId: `${partitionId}$${partitionType}`, 
                    page: 1 
                });
                const categoryList = Array.isArray(categoryRet?.list) ? categoryRet.list : [];
                for (const item of categoryList) {
                    if (!item?.vod_id || seen.has(item.vod_id)) continue;
                    seen.add(item.vod_id);
                    merged.push({
                        ...item,
                        vod_remarks: item.vod_remarks || partition?.title || keyword
                    });
                    if (merged.length >= 20) break;
                }
                if (merged.length >= 20) break;
            } catch (e) {
                logError('分区降级搜索失败', e);
            }
        }
        
        return { list: merged, page: pg };
    } catch (e) {
        logError('搜索失败', e);
        return { list: [], page: pg };
    }
}

/**
 * 播放
 */
async function play(params) {
    const playId = params.playId;
    logInfo(`准备播放 ID: ${playId}`);
    
    return {
        urls: [{ name: "直连", url: playId }],
        parse: 0,
        header: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': host
        }
    };
}

// ========== 模块导出 ==========
module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);