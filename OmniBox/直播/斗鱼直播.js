// @name 斗鱼直播
// @author 
// @description 
// @dependencies: axios, crypto-js
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/直播/斗鱼直播.js

/**
 * ============================================================================
 * 斗鱼直播 - OmniBox 爬虫脚本
 * ============================================================================
 */
const axios = require("axios");
const CryptoJS = require("crypto-js");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ==========
const host = "https://m.douyu.com";
const did = "10000000000000000000000000001501";

const def_headers = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
};

// ========== 分类映射 ==========
const categories = {
  'yqk': '娱乐天地',
  'LOL': '网游竞技',
  'TVgame': '单机热游',
  'wzry': '手游休闲',
  'yz': '颜值',
  'smkj': '科技文化',
  'yiqiwan': '语音互动',
  'yyzs': '语音直播',
  'znl': '正能量'
};

/**
 * 日志工具函数
 */
const logInfo = (message, data = null) => {
  const output = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[DOUYU-DEBUG] ${output}`);
};

const logError = (message, error) => {
  OmniBox.log("error", `[DOUYU-DEBUG] ${message}: ${error.message || error}`);
};

/**
 * 核心:解析播放源字符串为结构化数组 [1]
 */
const parsePlaySources = (fromStr, urlStr) => {
  logInfo("开始解析播放源字符串", { from: fromStr, url: urlStr });
  const playSources = [];
  if (!fromStr || !urlStr) return playSources;

  const froms = fromStr.split('$$$');
  const urls = urlStr.split('$$$');

  for (let i = 0; i < froms.length; i++) {
    const sourceName = froms[i] || `线路${i + 1}`;
    const sourceItems = urls[i] ? urls[i].split('#') : [];

    const episodes = sourceItems.map(item => {
      const parts = item.split('$');
      return {
        name: parts[0] || '正片',
        playId: parts[1] || parts[0]
      };
    }).filter(e => e.playId);

    if (episodes.length > 0) {
      playSources.push({
        name: sourceName,
        episodes: episodes
      });
    }
  }
  logInfo("播放源解析结果", playSources);
  return playSources;
};

/**
 * 通用请求函数
 */
async function req(url, options = {}) {
  try {
    const response = await axios({
      url: url,
      method: options.method || 'GET',
      headers: options.headers || def_headers,
      data: options.body || null,
      timeout: options.timeout || 15000,
    });
    return {
      content: typeof response.data === 'object' ? JSON.stringify(response.data) : response.data
    };
  } catch (error) {
    logError(`请求失败 URL: ${url}`, error);
    return { content: "{}" };
  }
}

// ========== 接口实现 ==========

async function home(params) {
  logInfo("进入斗鱼直播首页");
  
  let classes = Object.keys(categories).map(key => ({
    'type_id': key,
    'type_name': categories[key]
  }));
  
  return {
    class: classes,
    list: []
  };
}

async function category(params) {
  const { categoryId, page } = params;
  const pg = parseInt(page) || 1;
  logInfo(`请求斗鱼分类: ${categoryId}, 页码: ${pg}`);
  
  try {
    const url = `${host}/api/room/list?page=${pg}&type=${categoryId}`;
    const resp = await req(url);
    const json = JSON.parse(resp.content);
    
    logInfo("分类接口返回数据", json);
    
    let list = (json.data.list || []).map(item => ({
      "vod_id": item.rid.toString(),
      "vod_name": item.roomName,
      "vod_pic": item.roomSrc,
      "vod_remarks": `🔥${item.hn} | ${item.nickname}`,
      "style": { "type": "rect", "ratio": 1.33 }
    }));
    
    return {
      list: list,
      page: pg,
      pagecount: 99
    };
  } catch (e) {
    logError("分类请求失败", e);
    return { list: [], page: pg, pagecount: 0 };
  }
}

async function search(params) {
  const wd = params.keyword || params.wd || "";
  const pg = parseInt(params.page) || 1;
  logInfo(`搜索斗鱼关键词: ${wd}, 页码: ${pg}`);
  
  try {
    const offset = (pg - 1) * 20;
    const url = `${host}/api/search/liveRoom?sk=${encodeURIComponent(wd)}&offset=${offset}&limit=20&did=${did}`;
    const resp = await req(url);
    const json = JSON.parse(resp.content);
    
    logInfo("搜索接口返回数据", json);
    
    let list = (json.data.list || []).map(item => ({
      "vod_id": item.rid.toString(),
      "vod_name": item.roomName,
      "vod_pic": item.roomSrc,
      "vod_remarks": item.nickname
    }));
    
    return {
      list: list,
      page: pg,
      pagecount: 10
    };
  } catch (e) {
    logError("搜索失败", e);
    return { list: [], page: pg, pagecount: 0 };
  }
}

async function detail(params) {
  const videoId = params.videoId;
  logInfo(`请求斗鱼直播间详情 ID: ${videoId}`);
  
  try {
    // ✅ 关键修正：使用 parsePlaySources 解析播放源 [1]
    const playSources = parsePlaySources("Douyu", `点击播放$${videoId}`);
    
    return {
      list: [{
        "vod_id": videoId,
        "vod_name": "直播间: " + videoId,
        "vod_play_sources": playSources,  // ✅ 必须返回此格式 [1]
        "vod_content": "斗鱼直播间"
      }]
    };
  } catch (e) {
    logError("详情获取失败", e);
    return { list: [] };
  }
}

async function play(params) {
  const playId = params.playId;
  logInfo(`准备播放斗鱼直播间 ID: ${playId}`);
  
  try {
    const tt = Math.floor(Date.now() / 1000);
    
    // A. 获取动态加密脚本参数
    const encUrl = `https://www.douyu.com/wgapi/livenc/liveweb/websec/getEncryption?did=${did}`;
    const encResp = await req(encUrl, { 
      headers: { 
        'Referer': `https://www.douyu.com/${playId}`,
        'User-Agent': def_headers['User-Agent']
      } 
    });
    const encData = JSON.parse(encResp.content);
    
    logInfo("加密参数获取结果", encData);
    
    if (!encData || encData.error !== 0) {
      logError("获取加密参数失败", new Error("encData error"));
      return { 
        urls: [],
        parse: 0,
        header: def_headers
      };
    }
    
    const sec = encData.data;
    
    // B. 实现斗鱼 MD5 签名逻辑 [2]
    let current = sec.rand_str;
    for (let i = 0; i < sec.enc_time; i++) {
      current = CryptoJS.MD5(current + sec.key).toString();
    }
    const auth = CryptoJS.MD5(current + sec.key + playId + tt).toString();
    
    logInfo("签名计算完成", { auth });
    
    // C. 请求真实 H5 流地址
    const streamUrl = `https://www.douyu.com/lapi/live/getH5PlayV1/${playId}`;
    const postData = `v=22032021&did=${did}&tt=${tt}&auth=${auth}&enc_data=${sec.enc_data}`;
    
    const streamResp = await req(streamUrl, {
      method: 'POST',
      body: postData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `https://www.douyu.com/${playId}`,
        'User-Agent': def_headers['User-Agent']
      }
    });
    
    const streamData = JSON.parse(streamResp.content);
    logInfo("流地址获取结果", streamData);
    
    if (!streamData || streamData.error !== 0) {
      logError("获取流地址失败", new Error("streamData error"));
      return { 
        urls: [],
        parse: 0,
        header: def_headers
      };
    }
    
    const final_url = `${streamData.data.rtmp_url}/${streamData.data.rtmp_live}`;
    logInfo(`最终播放地址: ${final_url}`);
    
    return {
      urls: [{ name: "斗鱼直播", url: final_url }],
      parse: 0,
      header: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.douyu.com/'
      }
    };
  } catch (e) {
    logError("播放地址解析失败", e);
    return { 
      urls: [],
      parse: 0,
      header: def_headers
    };
  }
}

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);