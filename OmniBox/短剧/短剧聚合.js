// @name 短剧聚合
// @author 
// @description
// @dependencies: axios, crypto-js
// @version 1.0.4
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/短剧/短剧聚合.js

/**
 * ============================================================================
 * 短剧聚合 - OmniBox 爬虫脚本
 * ============================================================================
 * 聚合平台: 百度/甜圈/锦鲤/番茄/星芽/西饭/软鸭/七猫/牛牛/围观/碎片
 * 百度/番茄/西饭 不会修
 * 核心功能:
 *   - 多平台聚合搜索
 *   - 统一分类筛选
 *   - 自动 Token 管理
 * 修改时间: 2026-03-01
 * ============================================================================
 */

const CryptoJS = require("crypto-js");
const axios = require("axios");
const OmniBox = require("omnibox_sdk");
const https = require("https");

// ========== 全局配置 ==========
const aggConfig = {
    keys: 'd3dGiJc651gSQ8w1',
    charMap: {
        '+': 'P', '/': 'X', '0': 'M', '1': 'U', '2': 'l', '3': 'E', '4': 'r', '5': 'Y', '6': 'W', '7': 'b', '8': 'd', '9': 'J',
        'A': '9', 'B': 's', 'C': 'a', 'D': 'I', 'E': '0', 'F': 'o', 'G': 'y', 'H': '_', 'I': 'H', 'J': 'G', 'K': 'i', 'L': 't',
        'M': 'g', 'N': 'N', 'O': 'A', 'P': '8', 'Q': 'F', 'R': 'k', 'S': '3', 'T': 'h', 'U': 'f', 'V': 'R', 'W': 'q', 'X': 'C',
        'Y': '4', 'Z': 'p', 'a': 'm', 'b': 'B', 'c': 'O', 'd': 'u', 'e': 'c', 'f': '6', 'g': 'K', 'h': 'x', 'i': '5', 'j': 'T',
        'k': '-', 'l': '2', 'm': 'z', 'n': 'S', 'o': 'Z', 'p': '1', 'q': 'V', 'r': 'v', 's': 'j', 't': 'Q', 'u': '7', 'v': 'D',
        'w': 'w', 'x': 'n', 'y': 'L', 'z': 'e'
    },
    headers: {
        niuniu: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/json;charset=UTF-8',
            'User-Agent': 'okhttp/4.12.0'
        },
        default: {
            'User-Agent': 'okhttp/3.12.11',
            'content-type': 'application/json; charset=utf-8'
        }
    },
    platform: {
        百度: {
            host: 'https://api.jkyai.top',
            url1: '/API/bddjss.php?name=fyclass&page=fypage',
            url2: '/API/bddjss.php?id=fyid',
            search: '/API/bddjss.php?name=**&page=fypage'
        },
        甜圈: {
            host: 'https://mov.cenguigui.cn',
            url1: '/duanju/api.php?classname',
            url2: '/duanju/api.php?book_id',
            search: '/duanju/api.php?name'
        },
        锦鲤: {
            host: 'https://api.jinlidj.com',
            search: '/api/search',
            url2: '/api/detail'
        },
        番茄: {
            host: 'https://reading.snssdk.com',
            url1: '/reading/bookapi/bookmall/cell/change/v',
            url2: 'https://fqgo.52dns.cc/catalog',
            search: 'https://fqgo.52dns.cc/search'
        },
        星芽: {
            host: 'https://app.whjzjx.cn',
            url1: '/cloud/v2/theater/home_page?theater_class_id',
            url2: '/v2/theater_parent/detail',
            search: '/v3/search',
            loginUrl: 'https://u.shytkjgs.com/user/v1/account/login'
        },
        西饭: {
            host: 'https://xifan-api-cn.youlishipin.com',
            url1: '/xifan/drama/portalPage',
            url2: '/xifan/drama/getDuanjuInfo',
            search: '/xifan/search/getSearchList'
        },
        软鸭: {
            host: 'https://api.xingzhige.com',
            url1: '/API/playlet',
            search: '/API/playlet'
        },
        七猫: {
            host: 'https://api-store.qmplaylet.com',
            url1: '/api/v1/playlet/index',
            url2: 'https://api-read.qmplaylet.com/player/api/v1/playlet/info',
            search: '/api/v1/playlet/search'
        },
        牛牛: {
            host: 'https://new.tianjinzhitongdaohe.com',
            url1: '/api/v1/app/screen/screenMovie',
            url2: '/api/v1/app/play/movieDetails',
            search: '/api/v1/app/search/searchMovie'
        },
        围观: {
            host: 'https://api.drama.9ddm.com',
            url1: '/drama/home/shortVideoTags',
            url2: '/drama/home/shortVideoDetail',
            search: '/drama/home/search'
        },
        碎片: {
            host: 'https://free-api.bighotwind.cc',
            url1: '/papaya/papaya-api/theater/tags',
            url2: '/papaya/papaya-api/videos/info',
            search: '/papaya/papaya-api/videos/page'
        }
    },
    platformList: [
         { name: '七猫短剧', id: '七猫' },
         { name: '软鸭短剧', id: '软鸭' },
         { name: '西饭短剧', id: '西饭' },
         { name: '甜圈短剧', id: '甜圈' }
    ],
    search: { limit: 30, timeout: 6000 }
};

// 默认筛选配置
const filter_def = {
    百度: { area: '逆袭' },
    甜圈: { area: '逆袭' },
    锦鲤: { area: '' },
    番茄: { area: 'videoseries_hot' },
    星芽: { area: '1' },
    西饭: { area: '68@都市' },
    软鸭: { area: '战神' },
    七猫: { area: '0' },
    牛牛: { area: '现言' },
    围观: { area: '' },
    碎片: { area: '' }
};

// 手动构建的筛选数据
const customFilters = {
    "百度": [{
        key: "area",
        name: "题材",
        init: "逆袭",
        value: [
            { name: "逆袭", value: "逆袭" }, { name: "战神", value: "战神" }, { name: "都市", value: "都市" },
            { name: "穿越", value: "穿越" }, { name: "重生", value: "重生" }, { name: "古装", value: "古装" },
            { name: "言情", value: "言情" }, { name: "虐恋", value: "虐恋" }, { name: "甜宠", value: "甜宠" },
            { name: "神医", value: "神医" }, { name: "萌宝", value: "萌宝" }
        ]
    }],
    "甜圈": [{
        key: "area",
        name: "分类",
        init: "逆袭",
        value: [
            { name: "逆袭", value: "逆袭" },
            { name: "霸总", value: "霸总" },
            { name: "现代言情", value: "现代言情" },
            { name: "打脸虐渣", value: "打脸虐渣" },
            { name: "豪门恩怨", value: "豪门恩怨" },
            { name: "神豪", value: "神豪" },
            { name: "马甲", value: "马甲" },
            { name: "都市日常", value: "都市日常" },
            { name: "战神归来", value: "战神归来" },
            { name: "小人物", value: "小人物" },
            { name: "女性成长", value: "女性成长" },
            { name: "大女主", value: "大女主" },
            { name: "穿越", value: "穿越" },
            { name: "都市修仙", value: "都市修仙" },
            { name: "强者回归", value: "强者回归" },
            { name: "亲情", value: "亲情" },
            { name: "古装", value: "古装" },
            { name: "重生", value: "重生" },
            { name: "闪婚", value: "闪婚" },
            { name: "赘婿逆袭", value: "赘婿逆袭" },
            { name: "虐恋", value: "虐恋" },
            { name: "追妻", value: "追妻" },
            { name: "天下无敌", value: "天下无敌" },
            { name: "家庭伦理", value: "家庭伦理" },
            { name: "萌宝", value: "萌宝" },
            { name: "古风权谋", value: "古风权谋" },
            { name: "职场", value: "职场" },
            { name: "奇幻脑洞", value: "奇幻脑洞" },
            { name: "异能", value: "异能" },
            { name: "无敌神医", value: "无敌神医" },
            { name: "古风言情", value: "古风言情" },
            { name: "传承觉醒", value: "传承觉醒" },
            { name: "现言甜宠", value: "现言甜宠" },
            { name: "奇幻爱情", value: "奇幻爱情" },
            { name: "乡村", value: "乡村" },
            { name: "历史古代", value: "历史古代" },
            { name: "王妃", value: "王妃" },
            { name: "高手下山", value: "高手下山" },
            { name: "娱乐圈", value: "娱乐圈" },
            { name: "强强联合", value: "强强联合" },
            { name: "破镜重圆", value: "破镜重圆" },
            { name: "暗恋成真", value: "暗恋成真" },
            { name: "民国", value: "民国" },
            { name: "欢喜冤家", value: "欢喜冤家" },
            { name: "系统", value: "系统" },
            { name: "真假千金", value: "真假千金" },
            { name: "龙王", value: "龙王" },
            { name: "校园", value: "校园" },
            { name: "穿书", value: "穿书" },
            { name: "女帝", value: "女帝" },
            { name: "团宠", value: "团宠" },
            { name: "年代爱情", value: "年代爱情" },
            { name: "玄幻仙侠", value: "玄幻仙侠" },
            { name: "青梅竹马", value: "青梅竹马" },
            { name: "悬疑推理", value: "悬疑推理" },
            { name: "皇后", value: "皇后" },
            { name: "替身", value: "替身" },
            { name: "大叔", value: "大叔" },
            { name: "喜剧", value: "喜剧" },
            { name: "剧情", value: "剧情" }
        ]
    }],
    "锦鲤": [{
        key: "area",
        name: "分类",
        init: "",
        value: [
            { name: "全部", value: "" }, { name: "推荐", value: "1" }, { name: "霸总", value: "2" },
            { name: "战神", value: "3" }, { name: "神医", value: "4" }, { name: "虐恋", value: "5" },
            { name: "萌宝", value: "6" }, { name: "逆袭", value: "7" }, { name: "穿越", value: "8" },
            { name: "古装", value: "9" }, { name: "重生", value: "10" }
        ]
    }],
    "番茄": [{
        key: "area",
        name: "分类",
        init: "videoseries_hot",
        value: [
            { name: "热剧", value: "videoseries_hot" },
            { name: "新剧", value: "firstonlinetime_new" },
            { name: "逆袭", value: "cate_739" },
            { name: "总裁", value: "cate_29" },
            { name: "现言", value: "cate_3" },
            { name: "打脸", value: "cate_1051" },
            { name: "马甲", value: "cate_266" },
            { name: "豪门", value: "cate_1053" },
            { name: "都市", value: "cate_261" },
            { name: "神豪", value: "cate_20" }
        ]
    }],
    "星芽": [{
        key: "area",
        name: "频道",
        init: "1",
        value: [
            { name: "推荐", value: "1" }, { name: "男频", value: "2" }, { name: "女频", value: "3" }
        ]
    }],
    "西饭": [{
        key: "area",
        name: "分类",
        init: "68@都市",
        value: [
            { name: "都市", value: "68@都市" },
            { name: "青春", value: "68@青春" },
            { name: "现代言情", value: "81@现代言情" },
            { name: "豪门", value: "81@豪门" },
            { name: "大女主", value: "80@大女主" },
            { name: "逆袭", value: "79@逆袭" },
            { name: "打脸虐渣", value: "79@打脸虐渣" },
            { name: "穿越", value: "81@穿越" },
            { name: "推荐", value: "68@推荐" },
            { name: "情节", value: "79@情节" },
            { name: "角色", value: "80@角色" },
            { name: "主题", value: "81@主题" },
            { name: "集数", value: "82@集数" }
        ]
    }],
    "软鸭": [{
        key: "area",
        name: "题材",
        init: "战神",
        value: [
            { name: "战神", value: "战神" },
            { name: "逆袭", value: "逆袭" },
            { name: "人物", value: "人物" },
            { name: "都市", value: "都市" },
            { name: "擦边", value: "擦边" },
            { name: "人妖", value: "人妖" },
            { name: "闪婚", value: "闪婚" },
            { name: "古装", value: "古装" },
            { name: "霸总", value: "霸总" },
            { name: "强者", value: "强者" },
            { name: "玄幻", value: "玄幻" },
            { name: "神豪", value: "神豪" },
            { name: "现代", value: "现代" },
            { name: "爱情", value: "爱情" },
            { name: "虐渣", value: "虐渣" },
            { name: "总裁", value: "总裁" },
            { name: "无敌", value: "无敌" },
            { name: "奇幻", value: "奇幻" }
        ]
    }],
    "七猫": [{
        key: "area",
        name: "分类",
        init: "0",
        value: [
            { name: "全部", value: "0" }, { name: "都市", value: "1" }, { name: "言情", value: "2" },
            { name: "战神", value: "3" }, { name: "逆袭", value: "4" }, { name: "重生", value: "5" },
            { name: "穿越", value: "6" }, { name: "古装", value: "7" }
        ]
    }],
    "牛牛": [{
        key: "area",
        name: "分类",
        init: "现言",
        value: [
            { name: "现言", value: "现言" }, { name: "古言", value: "古言" }, { name: "战神", value: "战神" },
            { name: "逆袭", value: "逆袭" }, { name: "萌宝", value: "萌宝" }, { name: "神医", value: "神医" },
            { name: "其它", value: "其它" }
        ]
    }],
    "围观": [{
        key: "area",
        name: "分类",
        init: "",
        value: [
            { name: "全部", value: "" }
        ]
    }],
    "碎片": [{
        key: "area",
        name: "分类",
        init: "",
        value: [
            { name: "全部", value: "" }
        ]
    }]
};

// 全局变量
let xingya_headers = {};
let suipian_token = '';
let xifan_category_map = null;

/**
 * 创建 Axios 实例
 */
const axiosInstance = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 10000
});

// ========== 日志工具 ==========
const logInfo = function(message, data) {
    if (data !== undefined && data !== null) {
        OmniBox.log("info", "[短剧聚合] " + message + ": " + JSON.stringify(data));
    } else {
        OmniBox.log("info", "[短剧聚合] " + message);
    }
};

const logError = function(message, error) {
    OmniBox.log("error", "[短剧聚合] " + message + ": " + (error.message || error));
};

// ========== 工具函数 ==========

/**
 * 碎片剧场专用GUID生成
 */
const guid = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

/**
 * 碎片剧场专用AES加密
 */
const encHex = function(txt) {
    const k = CryptoJS.enc.Utf8.parse("p0sfjw@k&qmewu#w");
    const e = CryptoJS.AES.encrypt(
        CryptoJS.enc.Utf8.parse(txt),
        k, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
        }
    );
    return e.ciphertext.toString(CryptoJS.enc.Hex);
};

/**
 * HTTP 请求封装
 */
const request = async function(url, options) {
    options = options || {};
    const method = options.method || 'GET';
    const headers = options.headers || aggConfig.headers.default;
    const body = options.body;
    const timeout = options.timeout || 5000;

    try {
        const axiosOptions = {
            url: url,
            method: method,
            headers: headers,
            data: method.toUpperCase() === 'POST' ? body : undefined,
            timeout: timeout
        };

        const response = await axiosInstance(axiosOptions);
        if (typeof response.data === 'object') {
            return JSON.stringify(response.data);
        }
        return response.data;
    } catch (error) {
        logError("请求失败: " + url, error);
        throw error;
    }
};

/**
 * MD5 哈希
 */
const md5 = function(str) {
    return CryptoJS.MD5(str).toString();
};

/**
 * Base64 解码
 */
const atob = function(str) {
    return Buffer.from(str, 'base64').toString('utf8');
};

/**
 * 判断是否直链
 */
const isDirectPlayable = function(url) {
    return !!(url && url.match(/\.(m3u8|mp4|flv|avi|mkv|ts)(\?|$)/i));
};

/**
 * 七猫专用参数生成
 */
const getQmParamsAndSign = async function() {
    try {
        const sessionId = Math.floor(Date.now()).toString();
        let data = {
            "static_score": "0.8", "uuid": "00000000-7fc7-08dc-0000-000000000000",
            "device-id": "20250220125449b9b8cac84c2dd3d035c9052a2572f7dd0122edde3cc42a70",
            "mac": "", "sourceuid": "aa7de295aad621a6", "refresh-type": "0", "model": "22021211RC",
            "wlb-imei": "", "client-id": "aa7de295aad621a6", "brand": "Redmi", "oaid": "",
            "oaid-no-cache": "", "sys-ver": "12", "trusted-id": "", "phone-level": "H",
            "imei": "", "wlb-uid": "aa7de295aad621a6", "session-id": sessionId
        };
        const jsonStr = JSON.stringify(data);
        const base64Str = Buffer.from(jsonStr, 'utf8').toString('base64');
        let qmParams = '';
        for (let i = 0; i < base64Str.length; i++) {
            const c = base64Str[i];
            qmParams += aggConfig.charMap[c] || c;
        }
        
        const paramsStr = "AUTHORIZATION=app-version=10001application-id=com.duoduo.readchannel=unknownis-white=net-env=5platform=androidqm-params=" + qmParams + "reg=" + aggConfig.keys;
        return { qmParams: qmParams, sign: md5(paramsStr) };
    } catch (e) {
        logError('qm参数生成失败', e);
        throw e;
    }
};

/**
 * 七猫请求头
 */
const getHeaderX = async function() {
    const params = await getQmParamsAndSign();
    return {
        'net-env': '5', 'reg': '', 'channel': 'unknown', 'is-white': '', 'platform': 'android',
        'application-id': 'com.duoduo.read', 'authorization': '', 'app-version': '10001',
        'user-agent': 'webviewversion/0', 'qm-params': params.qmParams, 'sign': params.sign
    };
};

/**
 * 星芽 Token 初始化
 */
const initXingYaToken = async function() {
    if (Object.keys(xingya_headers).length > 0) return;

    try {
        const plat = aggConfig.platform['星芽'];
        const data = JSON.stringify({ 'device': '24250683a3bdb3f118dff25ba4b1cba1a' });
        const options = {
            method: 'POST',
            headers: {
                'User-Agent': 'okhttp/4.10.0',
                'platform': '1',
                'Content-Type': 'application/json'
            },
            body: data,
            timeout: 5000 
        };
        
        let html = await request(plat.loginUrl, options);
        const res = JSON.parse(html);
        const token = (res && res.data && res.data.token) || (res && res.data && res.data.data && res.data.data.token);
        xingya_headers = Object.assign({}, aggConfig.headers.default, { authorization: token });
        logInfo('星芽短剧token获取成功');
    } catch (e) {
        logError('星芽短剧token获取失败', e);
    }
};

/**
 * 碎片 Token 获取
 */
const getSuipianToken = async function() {
    if (suipian_token) return suipian_token;
    
    try {
        let openId = md5(guid());
        openId = openId.substring(0, 16);
        let api = "https://free-api.bighotwind.cc/papaya/papaya-api/oauth2/uuid";
        let body = JSON.stringify({ "openId": openId });
        let key = encHex(Date.now().toString());
        let res = JSON.parse(await request(api, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "key": key
            },
            body: body
        }));
        suipian_token = res.data.token;
        return suipian_token;
    } catch (e) {
        logError('碎片token获取失败', e);
        return '';
    }
};

/**
 * 西饭分类映射获取（分类名 -> 分类ID）
 */
const getXifanCategoryMap = async function() {
    if (xifan_category_map) return xifan_category_map;

    xifan_category_map = {};
    try {
        const plat = aggConfig.platform['西饭'];
        const xifanHeaders = { 'User-Agent': 'okhttp/3.12.11' };
        const api = plat.host + '/xifan/drama/portalPage?reqType=duanjuCategory&version=2001001&androidVersionCode=28';
        const html = await request(api, { headers: xifanHeaders, timeout: 8000 });
        const res = JSON.parse(html);
        const elements = ((res || {}).result || {}).elements || [];
        const list = ((elements[0] || {}).contents) || [];

        for (let i = 0; i < list.length; i++) {
            const item = list[i] || {};
            const vo = item.categoryItemVo || {};
            const name = vo.oppoCategory || '';
            const id = vo.categoryId;
            if (name && id !== undefined && id !== null) {
                xifan_category_map[name] = String(id);
            }
        }
    } catch (e) {
        logError('西饭分类映射获取失败', e);
    }

    return xifan_category_map;
};

// ========== 核心接口实现 ==========

/**
 * 首页
 */
async function home(params) {
    logInfo("🏠 进入首页");
    
    try {
        await initXingYaToken();
        
        const classes = aggConfig.platformList.map(function(item) {
            return {
                type_id: item.id,
                type_name: item.name
            };
        });
        
        return {
            class: classes,
            filters: customFilters
        };
    } catch (e) {
        logError("首页获取失败", e);
        return { class: [], filters: {} };
    }
}

/**
 * 分类（修复版）
 */
async function category(params) {
    const categoryId = params.categoryId;
    const page = params.page;
    const filterParams = params.filters || {};
    const pg = parseInt(page) || 1;
    
    logInfo("📂 请求分类: " + categoryId + ", 页码: " + pg);
    
    const d = [];
    const MY_CATE = categoryId;
    const MY_PAGE = pg;
    const PAGE_SIZE = aggConfig.search.limit || 30;

    const defaultArea = (filter_def[MY_CATE] && filter_def[MY_CATE].area) || '';
    const area = filterParams.area || defaultArea;

    const plat = aggConfig.platform[MY_CATE];
    const cfg = aggConfig;

    if (MY_CATE === '星芽') await initXingYaToken();

    let pagecount = MY_PAGE;
    let listLength = 0;
    let presumedPageSize = PAGE_SIZE;

    try {
        switch (MY_CATE) {
            case '百度': {
                presumedPageSize = 10;
                const url = plat.host + plat.url1.replace('fyclass', encodeURIComponent(area)).replace('fypage', MY_PAGE);
                const res = JSON.parse(await request(url, { headers: cfg.headers.default, timeout: 8000 }));
                
                // 安全检查
                if (!res || !res.data || !Array.isArray(res.data)) {
                    logError('百度返回数据格式错误', new Error(JSON.stringify(res)));
                    break;
                }
                
                for (let i = 0; i < res.data.length; i++) {
                    const it = res.data[i];
                    d.push({
                        vod_id: '百度@' + it.id,
                        vod_name: it.title,
                        vod_pic: it.cover,
                        vod_remarks: '更新至' + it.totalChapterNum + '集'
                    });
                }
                listLength = res.data.length;
                if (listLength >= presumedPageSize) pagecount = MY_PAGE + 1;
                else pagecount = MY_PAGE;
                break;
            }
            case '甜圈': {
                presumedPageSize = 13;  // 原规则每页13条
                const offset = (MY_PAGE - 1) * presumedPageSize;
                const url = plat.host + plat.url1 + '=' + encodeURIComponent(area) + '&offset=' + offset;
                
                const html = await request(url, { headers: cfg.headers.default, timeout: 8000 });
                
                // 检查是否是 HTML 错误页面
                if (!html || html.indexOf('<html') !== -1 || html.indexOf('<!DOCTYPE') !== -1) {
                    logError('甜圈返回HTML页面，可能接口失效', new Error('HTML response'));
                    break;
                }
                
                let res;
                try {
                    res = JSON.parse(html);
                } catch (parseError) {
                    logError('甜圈JSON解析失败: ' + html.substring(0, 200), parseError);
                    break;
                }
                
                // 安全检查 - 根据原规则，数据在 data.data 中
                if (!res || !res.data || !Array.isArray(res.data)) {
                    logError('甜圈返回数据格式错误', new Error('Expected res.data to be array, got: ' + JSON.stringify(res)));
                    break;
                }
                
                for (let i = 0; i < res.data.length; i++) {
                    const it = res.data[i];
                    d.push({
                        vod_id: '甜圈@' + (it.book_id || ''),
                        vod_name: it.title || '未知标题',
                        vod_pic: it.cover || '',
                        vod_remarks: (it.episode_cnt || '未知') + '集 | ⭐' + (it.score || '0')
                    });
                }
                
                listLength = res.data.length;
                // 如果返回了完整的一页数据，说明可能还有下一页
                if (listLength >= presumedPageSize) pagecount = MY_PAGE + 1;
                else pagecount = MY_PAGE;
                break;
            }
            case '锦鲤': {
                presumedPageSize = 24;
                const body = JSON.stringify({ page: MY_PAGE, limit: presumedPageSize, type_id: area, year: '', keyword: '' });
                const html = await request(plat.host + plat.search, { method: 'POST', body: body, headers: cfg.headers.default, timeout: 8000 });
                
                if (html.indexOf('<html') !== -1) {
                    logError('锦鲤返回HTML页面', new Error('HTML response'));
                    break;
                }
                
                const res = JSON.parse(html);
                
                if (!res || !res.data || !res.data.list || !Array.isArray(res.data.list)) {
                    logError('锦鲤返回数据格式错误', new Error(JSON.stringify(res)));
                    break;
                }
                
                for (let i = 0; i < res.data.list.length; i++) {
                    const item = res.data.list[i];
                    d.push({
                        vod_id: '锦鲤@' + item.vod_id,
                        vod_name: item.vod_name || '',
                        vod_pic: item.vod_pic,
                        vod_remarks: item.vod_total + '集'
                    });
                }
                listLength = res.data.list.length;
                if (listLength > 0) pagecount = MY_PAGE + 1;
                else pagecount = MY_PAGE;
                break;
            }
            case '番茄': {
                presumedPageSize = 12;
                const offset = (MY_PAGE - 1) * presumedPageSize;
                
                // 生成 sessionId（UTC时间格式：YYYYMMDDHHmm）
                const now = new Date();
                const sessionId = now.getUTCFullYear().toString() +
                    String(now.getUTCMonth() + 1).padStart(2, '0') +
                    String(now.getUTCDate()).padStart(2, '0') +
                    String(now.getUTCHours()).padStart(2, '0') +
                    String(now.getUTCMinutes()).padStart(2, '0');
                
                let url = plat.host + plat.url1 + '?change_type=0&selected_items=' + area + '&tab_type=8&cell_id=6952850996422770718&version_tag=video_feed_refactor&device_id=1423244030195267&aid=1967&app_name=novelapp&ssmix=a&session_id=' + sessionId;
                
                if (MY_PAGE > 1) {
                    url += '&offset=' + offset;
                }
                
                // 添加时间戳请求头
                const fqHeaders = Object.assign({}, cfg.headers.default, {
                    'X-SS-REQ-TICKET': Date.now().toString()
                });
                
                const html = await request(url, { headers: fqHeaders, timeout: 10000 });
                
                // 检查空响应
                if (!html || html.trim() === '') {
                    logError('番茄返回空响应', new Error('Empty response'));
                    break;
                }
                
                // 检查 HTML 响应
                if (html.indexOf('<html') !== -1 || html.indexOf('<!DOCTYPE') !== -1) {
                    logError('番茄返回HTML页面', new Error('HTML response: ' + html.substring(0, 200)));
                    break;
                }
                
                let res;
                try {
                    res = JSON.parse(html);
                } catch (parseError) {
                    logError('番茄JSON解析失败', new Error('Parse error, response: ' + html.substring(0, 200)));
                    break;
                }
                
                // 多种数据结构兼容
                let items = [];
                if (res && res.data && res.data.cell_view && res.data.cell_view.cell_data) {
                    items = res.data.cell_view.cell_data;
                } else if (res && res.search_tabs && Array.isArray(res.search_tabs)) {
                    for (let i = 0; i < res.search_tabs.length; i++) {
                        const tab = res.search_tabs[i];
                        if (tab.title === '短剧' && tab.data) {
                            items = tab.data;
                            break;
                        }
                    }
                } else if (res && res.data && Array.isArray(res.data)) {
                    items = res.data;
                } else if (res && typeof res === 'object') {
                    items = [res];
                }
                
                // 解析数据
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const videoData = (item.video_data && item.video_data[0]) || item;
                    const id = videoData.series_id || videoData.book_id || item.series_id || item.book_id || item.id || '';
                    
                    if (id) {
                        d.push({
                            vod_id: '番茄@' + id,
                            vod_name: videoData.title || item.title || '未知短剧',
                            vod_pic: videoData.cover || item.cover || videoData.horiz_cover || '',
                            vod_remarks: videoData.sub_title || videoData.rec_text || item.sub_title || ''
                        });
                    }
                }
                
                listLength = items.length;
                if (listLength === presumedPageSize) pagecount = MY_PAGE + 1;
                else pagecount = MY_PAGE;
                break;
            }
            case '星芽': {
                presumedPageSize = 24;
                const url = plat.host + plat.url1 + '=' + area + '&type=1&class2_ids=0&page_num=' + MY_PAGE + '&page_size=' + presumedPageSize;
                const html = await request(url, { headers: xingya_headers, timeout: 8000 });
                
                if (!html || html.indexOf('<html') !== -1) {
                    logError('星芽返回异常', new Error('Invalid response'));
                    break;
                }
                
                const res = JSON.parse(html);
                
                if (!res || !res.data || !res.data.list || !Array.isArray(res.data.list)) {
                    logError('星芽返回数据格式错误', new Error(JSON.stringify(res)));
                    break;
                }
                
                for (let i = 0; i < res.data.list.length; i++) {
                    const it = res.data.list[i];
                    const id = plat.host + plat.url2 + '?theater_parent_id=' + it.theater.id;
                    d.push({
                        vod_id: '星芽@' + id,
                        vod_name: it.theater.title,
                        vod_pic: it.theater.cover_url,
                        vod_remarks: it.theater.total + '集 | 播放量:' + it.theater.play_amount_str
                    });
                }
                listLength = res.data.list.length;
                if (listLength > 0) pagecount = MY_PAGE + 1;
                else pagecount = MY_PAGE;
                break;
            }
            case '西饭': {
                presumedPageSize = 30;
                const parts = area.split('@');
                let typeId = parts[0];
                const typeName = parts[1] || '';
                const ts = Math.floor(Date.now() / 1000);
                const offset = (MY_PAGE - 1) * presumedPageSize;
                const xifanHeaders = { 'User-Agent': 'okhttp/3.12.11' };

                if (!typeId || /^1\d{4,}$/.test(typeId)) {
                    const xifanMap = await getXifanCategoryMap();
                    if (xifanMap[typeName]) {
                        typeId = xifanMap[typeName];
                    }
                }
                
                const url = plat.host + plat.url1 + '?reqType=aggregationPage&offset=' + offset + '&categoryId=' + typeId + '&quickEngineVersion=-1&scene=&categoryNames=' + encodeURIComponent(typeName) + '&categoryVersion=1&density=1.5&pageID=page_theater&version=2001001&androidVersionCode=28&requestId=' + ts + 'aa498144140ef297&appId=drama&teenMode=false&userBaseMode=false&session=eyJpbmZvIjp7InVpZCI6IiIsInJ0IjoiMTc0MDY1ODI5NCIsInVuIjoiT1BHXzFlZGQ5OTZhNjQ3ZTQ1MjU4Nzc1MTE2YzFkNzViN2QwIiwiZnQiOiIxNzQwNjU4Mjk0In19&feedssession=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1dHlwIjowLCJidWlkIjoxNjMzOTY4MTI2MTQ4NjQxNTM2LCJhdWQiOiJkcmFtYSIsInZlciI6MiwicmF0IjoxNzQwNjU4Mjk0LCJ1bm0iOiJPUEdfMWVkZDk5NmE2NDdlNDUyNTg3NzUxMTZjMWQ3NWI3ZDAiLCJpZCI6IjNiMzViZmYzYWE0OTgxNDQxNDBlZjI5N2JkMDY5NGNhIiwiZXhwIjoxNzQxMjYzMDk0LCJkYyI6Imd6cXkifQ.JS3QY6ER0P2cQSxAE_OGKSMIWNAMsYUZ3mJTnEpf-Rc';
                
                const html = await request(url, { headers: xifanHeaders, timeout: 8000 });
                
                if (!html || html.indexOf('<html') !== -1) {
                    logError('西饭返回异常', new Error('Invalid response'));
                    break;
                }
                
                let res;
                try {
                    res = JSON.parse(html);
                } catch (parseError) {
                    logError('西饭JSON解析失败', parseError);
                    break;
                }
                
                // 检查数据结构
                if (!res || !res.result || !res.result.elements || !Array.isArray(res.result.elements)) {
                    logError('西饭返回数据格式错误', new Error('Invalid data structure: ' + JSON.stringify(res)));
                    break;
                }
                
                // 遍历 elements 和 contents
                for (let i = 0; i < res.result.elements.length; i++) {
                    const soup = res.result.elements[i];
                    if (soup.contents && Array.isArray(soup.contents)) {
                        for (let j = 0; j < soup.contents.length; j++) {
                            const vod = soup.contents[j];
                            if (vod.duanjuVo) {
                                const dj = vod.duanjuVo;
                                d.push({
                                    vod_id: '西饭@' + dj.duanjuId + '#' + dj.source,
                                    vod_name: dj.title || '未知短剧',
                                    vod_pic: dj.coverImageUrl || '',
                                    vod_remarks: (dj.total || '未知') + '集'
                                });
                            }
                        }
                    }
                }
                
                listLength = d.length;
                // 如果有数据就认为可能还有下一页
                if (listLength > 0) pagecount = MY_PAGE + 1;
                else pagecount = MY_PAGE;
                break;
            }
            case '软鸭': {
                presumedPageSize = 10;
                const url = plat.host + plat.url1 + '/?keyword=' + encodeURIComponent(area) + '&page=' + MY_PAGE;
                const html = await request(url, { headers: cfg.headers.default, timeout: 8000 });
                
                if (!html || html.indexOf('<html') !== -1) {
                    logError('软鸭返回异常', new Error('Invalid response'));
                    break;
                }
                
                let res;
                try {
                    res = JSON.parse(html);
                } catch (parseError) {
                    logError('软鸭JSON解析失败', parseError);
                    break;
                }
                
                // 检查响应结构
                if (!res || !res.data || !Array.isArray(res.data)) {
                    logError('软鸭返回数据格式错误', new Error('data is not array: ' + JSON.stringify(res)));
                    break;
                }
                
                for (let i = 0; i < res.data.length; i++) {
                    const item = res.data[i];
                    // 确保所有字段都存在
                    const title = item.title || '未知标题';
                    const cover = item.cover || '';
                    const author = item.author || '';
                    const type = item.type || '';
                    const desc = item.desc || '';
                    const book_id = item.book_id || '';
                    
                    const purl = title + '@' + cover + '@' + author + '@' + type + '@' + desc + '@' + book_id;
                    d.push({
                        vod_id: '软鸭@' + encodeURIComponent(purl),
                        vod_name: title,
                        vod_pic: cover,
                        vod_remarks: type
                    });
                }
                listLength = res.data.length;
                if (listLength === presumedPageSize) pagecount = MY_PAGE + 1;
                else pagecount = MY_PAGE;
                break;
            }
            case '七猫': {
                presumedPageSize = 20;
                let signStr = 'operation=1playlet_privacy=1tag_id=' + area + aggConfig.keys;
                const sign = md5(signStr);
                const url = plat.host + plat.url1 + '?tag_id=' + area + '&playlet_privacy=1&operation=1&sign=' + sign;
                const headers = Object.assign({}, await getHeaderX(), cfg.headers.default);
                const html = await request(url, { method: 'GET', headers: headers, timeout: 8000 });
                
                if (!html || html.indexOf('<html') !== -1) {
                    logError('七猫返回异常', new Error('Invalid response'));
                    break;
                }
                
                const res = JSON.parse(html);
                const list = (res && res.data && res.data.list) || [];
                for (let i = 0; i < list.length; i++) {
                    const item = list[i];
                    d.push({
                        vod_id: '七猫@' + encodeURIComponent(item.playlet_id),
                        vod_name: item.title || '',
                        vod_pic: item.image_link || '',
                        vod_remarks: (item.total_episode_num || 0) + '集'
                    });
                }
                listLength = list.length;
                if (listLength === presumedPageSize) pagecount = MY_PAGE + 1;
                else pagecount = MY_PAGE;
                break;
            }
            case '牛牛': {
                presumedPageSize = 24;
                const body = JSON.stringify({
                    condition: { classify: area, typeId: 'S1' },
                    pageNum: MY_PAGE,
                    pageSize: presumedPageSize
                });
                const html = await request(plat.host + plat.url1, { method: 'POST', headers: cfg.headers.niuniu, body: body, timeout: 8000 });
                
                if (!html || html.indexOf('<html') !== -1) {
                    logError('牛牛返回异常', new Error('Invalid response'));
                    break;
                }
                
                const res = JSON.parse(html);
                const records = (res.data && res.data.records) || [];
                for (let i = 0; i < records.length; i++) {
                    const item = records[i];
                    d.push({
                        vod_id: '牛牛@' + item.id,
                        vod_name: item.name,
                        vod_pic: item.cover,
                        vod_remarks: (item.totalEpisode || 0) + '集'
                    });
                }
                listLength = records.length;
                const total = (res.data && res.data.total) || 0;
                if (total > 0) pagecount = Math.ceil(total / presumedPageSize);
                else if (listLength === presumedPageSize) pagecount = MY_PAGE + 1;
                break;
            }
            case '围观': {
                presumedPageSize = 30;
                const postData = JSON.stringify({
                    "audience": "全部受众", "page": MY_PAGE, "pageSize": presumedPageSize,
                    "searchWord": "", "subject": "全部主题"
                });
                const html = await request(plat.host + plat.search, { method: 'POST', headers: cfg.headers.default, body: postData, timeout: 8000 });
                
                if (!html || html.indexOf('<html') !== -1) {
                    logError('围观返回异常', new Error('Invalid response'));
                    break;
                }
                
                const res = JSON.parse(html);
                
                if (!res || !res.data || !Array.isArray(res.data)) {
                    logError('围观返回数据格式错误', new Error(JSON.stringify(res)));
                    break;
                }
                
                for (let i = 0; i < res.data.length; i++) {
                    const it = res.data[i];
                    d.push({
                        vod_id: '围观@' + it.oneId,
                        vod_name: it.title,
                        vod_pic: it.vertPoster,
                        vod_remarks: '集数:' + it.episodeCount + ' 播放:' + it.viewCount
                    });
                }
                listLength = res.data.length;
                if (listLength === presumedPageSize) pagecount = MY_PAGE + 1;
                else pagecount = MY_PAGE;
                break;
            }
            case '碎片': {
                presumedPageSize = 24;
                const token = await getSuipianToken();
                const headers = Object.assign({}, cfg.headers.default, { 'Authorization': token });
                const url = plat.host + plat.search + '?type=5&tagId=' + area + '&pageNum=' + MY_PAGE + '&pageSize=' + presumedPageSize;
                const html = await request(url, { headers: headers, timeout: 8000 });
                
                if (!html || html.indexOf('<html') !== -1) {
                    logError('碎片返回异常', new Error('Invalid response'));
                    break;
                }
                
                const res = JSON.parse(html);
                
                const list = res.list || [];
                for (let i = 0; i < list.length; i++) {
                    const it = list[i];
                    let compoundId = it.itemId + '@' + it.videoCode;
                    d.push({
                        vod_id: '碎片@' + compoundId,
                        vod_name: it.title,
                        vod_pic: "https://speed.hiknz.com/papaya/papaya-file/files/download/" + it.imageKey + "/" + it.imageName,
                        vod_remarks: '集数:' + it.episodesMax
                    });
                }
                listLength = list.length;
                if (listLength === presumedPageSize) pagecount = MY_PAGE + 1;
                else pagecount = MY_PAGE;
                break;
            }
        }
        
        if (pagecount < MY_PAGE) {
            pagecount = MY_PAGE;
        } else if (d.length === 0 && MY_PAGE > 1) {
            pagecount = MY_PAGE;
        }
        
    } catch (e) {
        logError('分类拉取失败（平台：' + MY_CATE + '）', e);
        pagecount = MY_PAGE;
    }

    return {
        list: d,
        page: MY_PAGE,
        pagecount: pagecount
    };
}

/**
 * 搜索（聚合所有平台）
 */
async function search(params) {
    const keyword = params.keyword || params.wd || "";
    const pg = parseInt(params.page) || 1;
    
    if (!keyword) {
        return { list: [], page: 1, pagecount: 0 };
    }
    
    logInfo("🔍 聚合搜索: " + keyword + ", 页码: " + pg);
    
    const cfg = aggConfig;
    const d = [];
    const searchLimit = cfg.search.limit || 30;
    const searchTimeout = cfg.search.timeout || 6000;

    if (pg === 1) await initXingYaToken();

    const searchPromises = cfg.platformList.map(async function(platform) {
        try {
            const plat = cfg.platform[platform.id];
            let results = [];

            switch (platform.id) {
                case '百度': {
                    const url = plat.host + plat.search.replace('**', encodeURIComponent(keyword)).replace('fypage', pg);
                    const res = JSON.parse(await request(url, { headers: cfg.headers.default, timeout: searchTimeout }));
                    if (res && res.data) {
                        results = res.data.map(function(item) {
                            return {
                                vod_id: '百度@' + item.id,
                                vod_name: item.title,
                                vod_pic: item.cover,
                                vod_remarks: '百度短剧 | 更新至' + item.totalChapterNum + '集'
                            };
                        });
                    }
                    break;
                }
                case '甜圈': {
                    const url = plat.host + plat.search + '=' + encodeURIComponent(keyword) + '&offset=' + pg;
                    const res = JSON.parse(await request(url, { headers: cfg.headers.default, timeout: searchTimeout }));
                    if (res && res.data) {
                        results = res.data.map(function(item) {
                            return {
                                vod_id: '甜圈@' + item.book_id,
                                vod_name: item.title,
                                vod_pic: item.cover,
                                vod_remarks: '甜圈短剧 | ' + (item.sub_title || '无简介')
                            };
                        });
                    }
                    break;
                }
                case '锦鲤': {
                    const body = JSON.stringify({ page: pg, limit: searchLimit, type_id: '', year: '', keyword: keyword });
                    const res = JSON.parse(await request(plat.host + plat.search, { method: 'POST', body: body, headers: cfg.headers.default, timeout: searchTimeout }));
                    if (res && res.data && res.data.list) {
                        results = res.data.list.map(function(item) {
                            return {
                                vod_id: '锦鲤@' + item.vod_id,
                                vod_name: item.vod_name || '未知短剧',
                                vod_pic: item.vod_pic || '',
                                vod_remarks: '锦鲤短剧 | ' + (item.vod_total || 0) + '集'
                            };
                        });
                    }
                    break;
                }
                case '番茄': {
                    const res = JSON.parse(await request(plat.search + '?keyword=' + encodeURIComponent(keyword) + '&page=' + pg, { timeout: searchTimeout, headers: cfg.headers.default }));
                    if (res && res.data && Array.isArray(res.data)) {
                        results = res.data.map(function(item) {
                            return {
                                vod_id: '番茄@' + (item.series_id || ''),
                                vod_name: item.title || '未知标题',
                                vod_pic: item.cover || '',
                                vod_remarks: '番茄短剧 | ' + (item.sub_title || '无简介')
                            };
                        });
                    }
                    break;
                }
                case '星芽': {
                    const url = plat.host + plat.search;
                    const body = JSON.stringify({ text: keyword });
                    const html = await request(url, { method: 'POST', headers: xingya_headers, body: body, timeout: searchTimeout });
                    
                    const res = JSON.parse(html);
                    if (res && res.data && res.data.theater && res.data.theater.search_data) {
                        results = res.data.theater.search_data.map(function(item) {
                            const id = plat.host + plat.url2 + '?theater_parent_id=' + item.id;
                            return {
                                vod_id: '星芽@' + id,
                                vod_name: item.title,
                                vod_pic: item.cover_url || '',
                                vod_remarks: '星芽短剧 | ' + (item.total || 0) + '集'
                            };
                        });
                    }
                    break;
                }
                case '西饭': {
                    const ts = Math.floor(Date.now() / 1000);
                    const xifanHeaders = { 'User-Agent': 'okhttp/3.12.11' };
                    const url = plat.host + plat.search + '?keyword=' + encodeURIComponent(keyword + '84') + '&pageIndex=' + pg + '&version=2001001&androidVersionCode=28&requestId=' + ts + 'ea3a14bc0317d76f&appId=drama&teenMode=false&userBaseMode=false&session=eyJpbmZvIjp7InVpZCI6IiIsInJ0IjoiMTc0MDY2ODk4NiIsInVuIjoiT1BHX2U5ODQ4NTgzZmM4ZjQzZTJhZjc5ZTcxNjRmZTE5Y2JjIiwiZnQiOiIxNzQwNjY4OTg2In19&feedssession=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1dHlwIjowLCJidWlkIjoxNjM0MDU3ODE4OTgxNDk5OTA0LCJhdWQiOiJkcmFtYSIsInZlciI6MiwicmF0IjoxNzQwNjY4OTg2LCJ1bm0iOiJPUEdfZTk4NDg1ODNmYzhmNDNlMmFmNzllNzE2NGZlMTljYmMiLCJpZCI6ImVhZGE1NmEyZWEzYTE0YmMwMzE3ZDc2ZmVjODJjNzc3IiwiZXhwIjoxNzQxMjczNzg2LCJkYyI6ImJqaHQifQ.IwuI0gK077RF4G10JRxgxx4GCG502vR8Z0W9EV4kd-c';
                    
                    const html = await request(url, { headers: xifanHeaders, timeout: searchTimeout });
                    
                    if (!html || html.indexOf('<html') !== -1) {
                        break;
                    }
                    
                    const res = JSON.parse(html);
                    if (res && res.result && res.result.elements && Array.isArray(res.result.elements)) {
                        for (let i = 0; i < res.result.elements.length; i++) {
                            const soup = res.result.elements[i];
                            if (soup.contents && Array.isArray(soup.contents)) {
                                for (let j = 0; j < soup.contents.length; j++) {
                                    const vod = soup.contents[j];
                                    if (vod.duanjuVo) {
                                        const dj = vod.duanjuVo;
                                        let name = (dj.title || '').replace(/<\/?tag>/g, "");
                                        results.push({
                                            vod_id: '西饭@' + dj.duanjuId + '#' + dj.source,
                                            vod_name: name || '未知短剧',
                                            vod_pic: dj.coverImageUrl || '',
                                            vod_remarks: '西饭短剧 | ' + (dj.total || '未知') + '集'
                                        });
                                    }
                                }
                            }
                        }
                    }
                    break;
                }
                case '软鸭': {
                    const url = plat.host + plat.search + '/?keyword=' + encodeURIComponent(keyword) + '&page=' + pg;
                    const res = JSON.parse(await request(url, { headers: cfg.headers.default, timeout: searchTimeout }));
                    if (res && res.data) {
                        results = res.data.map(function(item) {
                            const purl = item.title + '@' + item.cover + '@' + item.author + '@' + item.type + '@' + item.desc + '@' + item.book_id;
                            return {
                                vod_id: '软鸭@' + encodeURIComponent(purl),
                                vod_name: item.title,
                                vod_pic: item.cover,
                                vod_remarks: '软鸭短剧 | ' + (item.type || '无分类')
                            };
                        });
                    }
                    break;
                }
                case '七猫': {
                    let signStr = 'operation=2playlet_privacy=1search_word=' + keyword + cfg.keys;
                    const sign = md5(signStr);
                    const url = plat.host + plat.search + '?search_word=' + encodeURIComponent(keyword) + '&playlet_privacy=1&operation=2&sign=' + sign;
                    const headers = Object.assign({}, await getHeaderX(), cfg.headers.default);
                    const res = JSON.parse(await request(url, { method: 'GET', headers: headers, timeout: searchTimeout }));
                    if (res && res.data && res.data.list) {
                        results = res.data.list.map(function(item) {
                            return {
                                vod_id: '七猫@' + encodeURIComponent(item.playlet_id),
                                vod_name: item.title || '未知标题',
                                vod_pic: item.image_link || '',
                                vod_remarks: '七猫短剧 | ' + (item.total_episode_num || 0) + '集'
                            };
                        });
                    }
                    break;
                }
                case '牛牛': {
                    const body = JSON.stringify({
                        condition: { name: keyword, typeId: 'S1' },
                        pageNum: pg,
                        pageSize: searchLimit
                    });
                    const res = JSON.parse(await request(plat.host + plat.search, { method: 'POST', headers: cfg.headers.niuniu, body: body, timeout: searchTimeout }));
                    if (res && res.data && res.data.records) {
                        results = res.data.records.map(function(item) {
                            return {
                                vod_id: '牛牛@' + item.id,
                                vod_name: item.name,
                                vod_pic: item.cover,
                                vod_remarks: '牛牛短剧 | ' + (item.totalEpisode || 0) + '集'
                            };
                        });
                    }
                    break;
                }
                case '围观': {
                    const postData = JSON.stringify({
                        "audience": "", "page": pg, "pageSize": searchLimit,
                        "searchWord": keyword, "subject": ""
                    });
                    const res = JSON.parse(await request(
                        plat.host + plat.search,
                        { method: 'POST', body: postData, headers: cfg.headers.default, timeout: searchTimeout }
                    ));
                    if (res && res.data && Array.isArray(res.data)) {
                        results = res.data.map(function(it) {
                            return {
                                vod_id: '围观@' + (it.oneId || ''),
                                vod_name: it.title || '未知标题',
                                vod_pic: it.vertPoster || '',
                                vod_remarks: '围观短剧 | 集数:' + (it.episodeCount || 0) + ' 播放:' + (it.viewCount || 0)
                            };
                        });
                    }
                    break;
                }
                case '碎片': {
                    const token = await getSuipianToken();
                    const headers = Object.assign({}, cfg.headers.default, { 'Authorization': token });
                    const url = plat.host + plat.search + '?type=5&tagId=&pageNum=' + pg + '&pageSize=' + searchLimit + '&title=' + encodeURIComponent(keyword);
                    const res = JSON.parse(await request(url, { headers: headers, timeout: searchTimeout }));
                    if(res && res.list){
                        results = res.list.map(function(it) {
                            return {
                                vod_id: '碎片@' + it.itemId + '@' + it.videoCode,
                                vod_name: it.title,
                                vod_pic: "https://speed.hiknz.com/papaya/papaya-file/files/download/" + it.imageKey + "/" + it.imageName,
                                vod_remarks: '碎片剧场 | 集数:' + it.episodesMax
                            };
                        });
                    }
                    break;
                }
            }
            return { platform: platform.name, results: results || [] };
        } catch (error) {
            logError('搜索失败（平台：' + platform.name + '）', error);
            return { platform: platform.name, results: [] };
        }
    });

    const searchResults = await Promise.allSettled(searchPromises);
    
    for (let i = 0; i < searchResults.length; i++) {
        const result = searchResults[i];
        if (result.status === 'fulfilled' && result.value.results && result.value.results.length > 0) {
            d.push.apply(d, result.value.results);
        }
    }

    let finalResults = d.filter(function(item) {
        const title = item.vod_name || '';
        return title.toLowerCase().indexOf(keyword.toLowerCase()) !== -1;
    });
    
    const totalResults = finalResults.length;
    const offset = (pg - 1) * searchLimit;
    const slicedResults = finalResults.slice(offset, offset + searchLimit);
    const totalPages = Math.ceil(totalResults / searchLimit);

    return {
        list: slicedResults,
        page: pg,
        pagecount: totalPages
    };
}

/**
 * 详情
 */
async function detail(params) {
    const videoId = params.videoId;
    
    if (!videoId) {
        return { list: [] };
    }
    
    logInfo("📄 请求详情: " + videoId);
    
    const parts = videoId.split('@');
    const platform = parts[0];
    const detailId = parts.slice(1).join('@');
    const plat = aggConfig.platform[platform];
    
    if (platform === '星芽') await initXingYaToken();
    
    let VOD = {};
    
    try {
        switch (platform) {
            case '百度': {
                const res = JSON.parse(await request(plat.host + plat.url2.replace('fyid', detailId)));
                const episodes = [];
                for (let i = 0; i < res.data.length; i++) {
                    const item = res.data[i];
                    episodes.push({
                        name: item.title,
                        playId: item.video_id
                    });
                }
                
                VOD = {
                    vod_id: videoId,
                    vod_name: res.title,
                    vod_pic: res.data[0].cover,
                    vod_year: '更新至:' + res.total + '集',
                    vod_play_sources: [{
                        name: '百度短剧',
                        episodes: episodes
                    }]
                };
                break;
            }
            case '甜圈': {
                const res = JSON.parse(await request(plat.host + plat.url2 + '=' + detailId));
                const episodes = [];
                for (let i = 0; i < res.data.length; i++) {
                    const item = res.data[i];
                    episodes.push({
                        name: item.title,
                        playId: item.video_id
                    });
                }
                
                VOD = {
                    vod_id: videoId,
                    vod_name: res.book_name,
                    type_name: res.category,
                    vod_pic: res.book_pic,
                    vod_content: res.desc,
                    vod_remarks: res.duration,
                    vod_year: '更新时间:' + res.time,
                    vod_actor: res.author,
                    vod_play_sources: [{
                        name: '甜圈短剧',
                        episodes: episodes
                    }]
                };
                break;
            }
            case '锦鲤': {
                const res = JSON.parse(await request(plat.host + plat.url2 + '/' + detailId));
                const list = res.data;
                const episodes = [];
                const keys = Object.keys(list.player);
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    episodes.push({
                        name: key,
                        playId: list.player[key]
                    });
                }
                
                VOD = {
                    vod_id: videoId,
                    vod_name: list.vod_name || '暂无名称',
                    type_name: list.vod_class || '暂无类型',
                    vod_pic: list.vod_pic || '暂无图片',
                    vod_remarks: list.vod_remarks || '暂无备注',
                    vod_content: list.vod_blurb || '暂无剧情',
                    vod_play_sources: [{
                        name: '锦鲤短剧',
                        episodes: episodes
                    }]
                };
                break;
            }
            case '番茄': {
                const url = plat.url2 + '?book_id=' + detailId;
                const fqHeaders = Object.assign({}, aggConfig.headers.default, {
                    'X-SS-REQ-TICKET': Date.now().toString()
                });
                
                const html = await request(url, { headers: fqHeaders, timeout: 10000 });
                
                if (!html || html.indexOf('<html') !== -1) {
                    throw new Error('Invalid response');
                }
                
                const res = JSON.parse(html);
                const data = res.data || {};
                const bookInfo = data.book_info || {};
                const itemList = data.item_data_list || [];
                
                const episodes = [];
                for (let i = 0; i < itemList.length; i++) {
                    const item = itemList[i];
                    episodes.push({
                        name: item.title || '第' + (i+1) + '集',
                        playId: item.item_id
                    });
                }
                
                VOD = {
                    vod_id: videoId,
                    vod_name: bookInfo.book_name || '未知短剧',
                    vod_type: bookInfo.tags || '',
                    vod_pic: bookInfo.thumb_url || bookInfo.audio_thumb_uri || '',
                    vod_content: bookInfo.abstract || bookInfo.book_abstract_v2 || '暂无简介',
                    vod_remarks: bookInfo.sub_info || '更新至' + itemList.length + '集',
                    vod_year: bookInfo.create_time || '',
                    vod_play_sources: [{
                        name: '番茄短剧',
                        episodes: episodes
                    }]
                };
                break;
            }
            case '星芽': {
                const res = JSON.parse(await request(detailId, { headers: xingya_headers }));
                const data = res.data;
                const episodes = [];
                for (let i = 0; i < data.theaters.length; i++) {
                    const it = data.theaters[i];
                    episodes.push({
                        name: it.num,
                        playId: it.son_video_url
                    });
                }
                
                                VOD = {
                    vod_id: videoId,
                    vod_name: data.title,
                    type_name: data.score,
                    vod_pic: data.cover_url,
                    vod_content: data.introduction,
                    vod_remarks: data.desc_tags + '',
                    vod_play_sources: [{
                        name: '星芽短剧',
                        episodes: episodes
                    }]
                };
                break;
            }
            case '西饭': {
                const parts2 = detailId.split('#');
                const duanjuId = parts2[0];
                const source = parts2[1];
                const ts = Date.now();
                const xifanHeaders = { 'User-Agent': 'okhttp/3.12.11' };
                const url = plat.host + plat.url2 + '?duanjuId=' + duanjuId + '&source=' + source + '&openFrom=homescreen&type=&pageID=page_inner_flow&density=1.5&version=2001001&androidVersionCode=28&requestId=' + ts + 'aa498144140ef297&appId=drama&teenMode=false&userBaseMode=false&session=eyJpbmZvIjp7InVpZCI6IiIsInJ0IjoiMTc0MDY1ODI5NCIsInVuIjoiT1BHXzFlZGQ5OTZhNjQ3ZTQ1MjU4Nzc1MTE2YzFkNzViN2QwIiwiZnQiOiIxNzQwNjU4Mjk0In19&feedssession=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1dHlwIjowLCJidWlkIjoxNjMzOTY4MTI2MTQ4NjQxNTM2LCJhdWQiOiJkcmFtYSIsInZlciI6MiwicmF0IjoxNzQwNjU4Mjk0LCJ1bm0iOiJPUEdfMWVkZDk5NmE2NDdlNDUyNTg3NzUxMTZjMWQ3NWI3ZDAiLCJpZCI6IjNiMzViZmYzYWE0OTgxNDQxNDBlZjI5N2JkMDY5NGNhIiwiZXhwIjoxNzQxMjYzMDk0LCJkYyI6Imd6cXkifQ.JS3QY6ER0P2cQSxAE_OGKSMIWNAMsYUZ3mJTnEpf-Rc';
                const res = JSON.parse(await request(url, { headers: xifanHeaders }));
                const data = res.result;
                const episodes = [];
                for (let i = 0; i < data.episodeList.length; i++) {
                    const ep = data.episodeList[i];
                    episodes.push({
                        name: ep.index,
                        playId: ep.playUrl
                    });
                }
                
                VOD = {
                    vod_id: videoId,
                    vod_name: data.title,
                    vod_pic: data.coverImageUrl,
                    vod_content: data.desc || '未知',
                    vod_remarks: data.updateStatus === 'over' ? data.total + '集 已完结' : '更新' + data.total + '集',
                    vod_play_sources: [{
                        name: '西饭短剧',
                        episodes: episodes
                    }]
                };
                break;
            }
            case '软鸭': {
                const did = decodeURIComponent(detailId);
                const parts2 = did.split('@');
                const title = parts2[0];
                const img = parts2[1];
                const author = parts2[2];
                const type = parts2[3];
                const desc = parts2[4];
                const book_id = parts2[5];
                const detailUrl = plat.host + plat.url1 + '/?book_id=' + book_id;
                const res = JSON.parse(await request(detailUrl, { headers: aggConfig.headers.default }));
                const episodes = [];
                const videoList = (res.data && res.data.video_list) || [];
                for (let i = 0; i < videoList.length; i++) {
                    const ep = videoList[i];
                    episodes.push({
                        name: ep.title,
                        playId: ep.video_id
                    });
                }
                
                VOD = {
                    vod_id: videoId,
                    vod_name: title,
                    vod_pic: img,
                    vod_actor: author,
                    vod_remarks: type,
                    vod_content: desc,
                    vod_play_sources: [{
                        name: '软鸭短剧',
                        episodes: episodes
                    }]
                };
                break;
            }
            case '七猫': {
                const did = decodeURIComponent(detailId);
                const sign = md5('playlet_id=' + did + aggConfig.keys);
                const url = plat.url2 + '?playlet_id=' + did + '&sign=' + sign;
                const headers = Object.assign({}, await getHeaderX(), aggConfig.headers.default);
                
                const res = JSON.parse(await request(url, { method: 'GET', headers: headers }));
                const data = res.data;
                const episodes = [];
                for (let i = 0; i < data.play_list.length; i++) {
                    const it = data.play_list[i];
                    episodes.push({
                        name: it.sort,
                        playId: it.video_url
                    });
                }
                
                VOD = {
                    vod_id: videoId,
                    vod_name: data.title || '未知标题',
                    vod_pic: data.image_link || '未知图片',
                    vod_remarks: data.tags + ' ' + data.total_episode_num + '集',
                    vod_content: data.intro || '未知剧情',
                    vod_play_sources: [{
                        name: '七猫短剧',
                        episodes: episodes
                    }]
                };
                break;
            }
            case '牛牛': {
                const body = JSON.stringify({ id: detailId, source: 0, typeId: 'S1', userId: '223664' });
                const res = JSON.parse(await request(plat.host + plat.url2, { method: 'POST', headers: aggConfig.headers.niuniu, body: body }));
                const data = res.data || {};
                const episodes = [];
                const episodeList = data.episodeList || [];
                for (let i = 0; i < episodeList.length; i++) {
                    const ep = episodeList[i];
                    episodes.push({
                        name: ep.episode,
                        playId: detailId + '@' + ep.id
                    });
                }
                
                VOD = {
                    vod_id: videoId,
                    vod_name: data.name || '未知名称',
                    vod_pic: data.cover || '',
                    vod_content: data.introduce || '暂无剧情',
                    vod_play_sources: [{
                        name: '牛牛短剧',
                        episodes: episodes.length > 0 ? episodes : [{ name: '暂无播放地址', playId: '0' }]
                    }]
                };
                break;
            }
            case '围观': {
                const res = JSON.parse(await request(
                    plat.host + plat.url2 + '?oneId=' + detailId + '&page=1&pageSize=1000',
                    { headers: aggConfig.headers.default }
                ));
                const data = res.data;
                const firstEpisode = data[0];
                const episodes = [];
                for (let i = 0; i < data.length; i++) {
                    const episode = data[i];
                    episodes.push({
                        name: episode.title + '第' + episode.playOrder + '集',
                        playId: episode.playSetting
                    });
                }
                
                VOD = {
                    vod_id: videoId,
                    vod_name: firstEpisode.title,
                    vod_pic: firstEpisode.vertPoster,
                    vod_remarks: '共' + data.length + '集',
                    vod_content: '播放量:' + firstEpisode.collectionCount + ' 评论:' + firstEpisode.commentCount,
                    vod_play_sources: [{
                        name: '围观短剧',
                        episodes: episodes
                    }]
                };
                break;
            }
            case '碎片': {
                const token = await getSuipianToken();
                const headers = Object.assign({}, aggConfig.headers.default, { 'Authorization': token });
                const parts2 = detailId.split('@');
                const itemId = parts2[0];
                const videoCode = parts2[1];
                const url = plat.host + plat.url2 + '?videoCode=' + videoCode + '&itemId=' + itemId;
                const res = JSON.parse(await request(url, { headers: headers }));
                const data = res.data || res;
                
                const episodes = [];
                const episodesList = data.episodesList || [];
                for (let i = 0; i < episodesList.length; i++) {
                    const episode = episodesList[i];
                    let episodeTitle = '第' + episode.episodes + '集';
                    let playUrl = "";
                    if (episode.resolutionList && episode.resolutionList.length > 0) {
                        episode.resolutionList.sort(function(a, b) {
                            return b.resolution - a.resolution;
                        });
                        let bestResolution = episode.resolutionList[0];
                        playUrl = "https://speed.hiknz.com/papaya/papaya-file/files/download/" + bestResolution.fileKey + "/" + bestResolution.fileName;
                    }
                    if (playUrl) {
                        episodes.push({
                            name: episodeTitle,
                            playId: playUrl
                        });
                    }
                }

                VOD = {
                    vod_id: videoId,
                    vod_name: data.title,
                    vod_pic: "https://speed.hiknz.com/papaya/papaya-file/files/download/" + data.imageKey + "/" + data.imageName,
                    vod_remarks: '共' + data.episodesMax + '集',
                    vod_content: data.content || data.description || '播放量:' + data.hitShowNum + ' 点赞:' + data.likeNum,
                    vod_play_sources: [{
                        name: '碎片剧场',
                        episodes: episodes
                    }]
                };
                break;
            }
        }
    } catch (e) {
        logError('详情拉取失败（平台：' + platform + '）', e);
        VOD = {
            vod_id: videoId,
            vod_name: platform + '：详情加载失败',
            vod_remarks: e.message,
            vod_play_sources: [{
                name: '失败',
                episodes: [{ name: '失败', playId: '0' }]
            }]
        };
    }
    
    return { list: [VOD] };
}

/**
 * 播放
 */
async function play(params) {
    const playId = params.playId;
    const flag = params.flag || '';
    
    if (!playId) {
        return { urls: [], parse: 0 };
    }
    
    logInfo("🎬 准备播放: " + flag + " | playId=" + playId);
    
    const cfg = aggConfig;
    
    try {
        if (flag.indexOf('百度') !== -1) {
            const item = JSON.parse(await request('https://api.jkyai.top/API/bddjss.php?video_id=' + playId));
            let qualities = item.data.qualities;
            let urls = [];
            const qualityOrder = ["1080p", "sc", "sd"];
            const qualityNames = { "1080p": "蓝光", "sc": "超清", "sd": "标清" };
            for (let i = 0; i < qualityOrder.length; i++) {
                const qualityKey = qualityOrder[i];
                for (let j = 0; j < qualities.length; j++) {
                    const quality = qualities[j];
                    if (quality.quality === qualityKey) {
                        urls.push({
                            name: qualityNames[qualityKey],
                            url: quality.download_url
                        });
                        break;
                    }
                }
            }
            return { urls: urls, parse: 0 };
        }
        else if (flag.indexOf('甜圈短剧') !== -1) {
            const sniffResult = await OmniBox.sniffVideo('https://mov.cenguigui.cn/duanju/api.php?video_id=' + playId + '&type=mp4');
        return {
            urls: [{ name: '播放', url: sniffResult.url || playId }],
            parse: 0,
            header: sniffResult.header
        };
            // return {
            //     urls: [{ name: '播放', url: 'https://mov.cenguigui.cn/duanju/api.php?video_id=' + playId + '&type=mp4' }],
            //     parse: 0
            // };
        }
        else if (flag.indexOf('锦鲤短剧') !== -1) {
            const targetUrl = playId.indexOf('auto=1') !== -1 ? playId : playId + '&auto=1';
            const html = await request(targetUrl, { headers: { referer: 'https://www.jinlidj.com/' } });
            let url = '';
            const trimmed = (html || '').trim();
            if (trimmed && (trimmed[0] === '{' || trimmed[0] === '[')) {
                try {
                    const res = JSON.parse(trimmed);
                    url = (res && (res.url || (res.data && res.data.url))) || '';
                } catch (e) {
                    url = '';
                }
            }
            if (!url) {
                const dataMatch = html.match(/(?:let|var|const)\s+data\s*=\s*({[\s\S]*?});/);
                if (dataMatch) {
                    const urlMatch = dataMatch[1].match(/url\s*:\s*['"]([^'"]+)['"]/);
                    if (urlMatch) url = urlMatch[1];
                }
            }
            if (!url) {
                const urlMatch = html.match(/https?:\/\/[^'"\s]+\.(m3u8|mp4)(\?[^'"\s]*)?/i);
                if (urlMatch) url = urlMatch[0];
            }
            return {
                urls: url ? [{ name: '播放', url: url }] : [],
                parse: 0,
                header: { referer: 'https://www.jinlidj.com/' }
            };
        }
        else if (flag.indexOf('番茄短剧') !== -1) {
            const fqHeaders = Object.assign({}, cfg.headers.default, {
                'X-SS-REQ-TICKET': Date.now().toString()
            });
            
            const apiUrl = 'https://fqgo.52dns.cc/video?item_ids=' + playId;
            const html = await request(apiUrl, { headers: fqHeaders, timeout: 10000 });
            const res = JSON.parse(html);
            
            let url = '';
            if (res.data && res.data[playId]) {
                const videoModel = JSON.parse(res.data[playId].video_model);
                if (videoModel.video_list && videoModel.video_list.video_1) {
                    url = atob(videoModel.video_list.video_1.main_url);
                }
            }
            
            return { urls: url ? [{ name: '播放', url: url }] : [], parse: 0 };
        }
        else if (flag.indexOf('星芽短剧') !== -1) {
            return { urls: [{ name: '播放', url: playId }], parse: 0 };
        }
        else if (flag.indexOf('西饭短剧') !== -1) {
            return { urls: [{ name: '播放', url: playId }], parse: 0 };
        }
        else if (flag.indexOf('软鸭短剧') !== -1) {
            const res = JSON.parse(await request(cfg.platform.软鸭.host + '/API/playlet/?video_id=' + playId + '&quality=1080p', { headers: cfg.headers.default }));
            const url = (res.data && res.data.video && res.data.video.url) || '';
            return { urls: url ? [{ name: '播放', url: url }] : [], parse: 0 };
        }
        else if (flag.indexOf('七猫短剧') !== -1) {
            return { urls: [{ name: '播放', url: playId }], parse: 0 };
        }
        else if (flag.indexOf('牛牛短剧') !== -1) {
            const parts = playId.split('@');
            const videoId = parts[0];
            const episodeId = parts[1];
            const body = JSON.stringify({ episodeId: episodeId, id: videoId, source: 0, typeId: 'S1', userId: '223664' });
            const res = JSON.parse(await request(cfg.platform.牛牛.host + '/api/v1/app/play/movieDetails', {
                method: 'POST',
                headers: cfg.headers.niuniu,
                body: body
            }));
            const url = (res.data && res.data.url) || '';
            return {
                urls: url ? [{ name: '播放', url: url }] : [],
                parse: 0,
                header: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36' }
            };
        }
        else if (flag.indexOf('围观短剧') !== -1) {
            let playSetting;
            try {
                playSetting = typeof playId === 'string' ? JSON.parse(playId) : playId;
            } catch (e) {
                return { urls: [{ name: '播放', url: playId }], parse: 0 };
            }
            let urls = [];
            if (playSetting.super) {
                urls.push({ name: '超清', url: playSetting.super });
            }
            if (playSetting.high) {
                urls.push({ name: '高清', url: playSetting.high });
            }
            if (playSetting.normal) {
                urls.push({ name: '流畅', url: playSetting.normal });
            }
            return { urls: urls, parse: 0 };
        }
        else if (flag.indexOf('碎片剧场') !== -1) {
            return { urls: [{ name: '播放', url: playId }], parse: 0 };
        }
        
        if (isDirectPlayable(playId)) {
            return { urls: [{ name: '播放', url: playId }], parse: 0 };
        }

        const sniffResult = await OmniBox.sniffVideo(playId);
        return {
            urls: [{ name: '播放', url: sniffResult.url || playId }],
            parse: 0,
            header: sniffResult.header
        };
    } catch (e) {
        logError('播放解析失败', e);
        return { urls: [], parse: 0 };
    }
}

// ========== 导出模块 ==========
module.exports = { home: home, category: category, search: search, detail: detail, play: play };

const runner = require("spider_runner");
runner.run(module.exports);
