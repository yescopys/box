// @name YY轮播
// @author 
// @description 
// @dependencies: axios
// @version 1.1.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/直播/YY轮播.js

const axios = require("axios");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ==========
const DEFAULT_PIC = "https://img.alicdn.com/imgextra/i2/O1CN01m9V4QW1j9y9z9z9z9_!!6000000004502-2-tps-200-200.png";
const FAKE_COOKIE = "hd_newui=0.016482617745180117; hdjs_session_id=0.3502330236842982; hiido_ui=0.2409064060963675; hdjs_session_time=1773647185721";
const PAGE_SIZE = 20; // 每页显示数量

// 性能优化配置
const BATCH_SIZE = 5; // 并发请求数（从3提升到5）
const BATCH_DELAY = 100; // 批次延迟（从200ms降到100ms）
const SEARCH_TIMEOUT = 2000; // 搜索超时（从3000ms降到2000ms）

// ========== 画质配置 ==========
const QUALITY_CONFIG = {
    options: [
        { name: "标清(360P)", bitrate: "1200" },
        { name: "高清(480P)", bitrate: "2500" },
        { name: "超清(720P)", bitrate: "4500" },
        { name: "蓝光(1080P)", bitrate: "8000" }
    ],
    default: "8000",
    generatePlayUrl: function(id) {
        return this.options.map(q => 
            `${q.name}$${id}_${q.bitrate}`
        ).join('#');
    },
    parseQuality: function(playId) {
        if (playId.includes("_")) {
            const parts = playId.split("_");
            return { id: parts[0], quality: parts[1] };
        }
        return { id: playId, quality: this.default };
    }
};

// ========== 频道数据源（需要手动替换）==========
const RAW_DATA = `
电影,#genre#
【林正英经典】玄幻电影,1462895099
超精彩武打场景,1354936131
林正英-经典电影,34229877
周星驰搞笑在线,1351537467
港片喜剧动作,1355480591
经典鬼片3000部,29460894
林正英经典,1351505899
李连杰功夫经典武侠,74613175
张国荣与周润发的兄弟情,1354930961
夏洛特烦恼-国内电影-喜剧,1354936201
鹿鼎记-周星驰版,1354658049
赌神港片喜剧,1355112116
智取威虎山,1382736843
成龙系列,1354888751
超清鬼片港片,1335509613
洪金宝福星系列,1354924839
震撼！国内功夫大片,1382736902
国内玄幻电影-林正英,1354932444
速度与激情全集,1382749892
漫威十年老粉福利来了,1354930233
宋小宝春晚小品合集,1382736866
巩汉林春晚小品合集,1354889035
科幻惊悚片-异形,1382735543
小鬼当家-童年回忆,1382745104
电影黑豹,1382736816
电影百团大战,1382736871
周星星系列,1354888671
猩球崛起-怪兽片合集,1354930181
爆笑电影！王牌大贱谍2-3,1382735556
蔡明春晚小品,1354936177
飓风营救,1382735547
国外黑色喜剧：冷幽默小剧场,1382745175
国产大片电影,1354926655
郭德纲-坑王驾到,1382745111
末日系列-外国电影合集,1354889019
憨豆先生-经典喜剧,1354936239
国产电影-就是闹着玩的,1354931503
心理追凶-烧脑港剧,1354936207
忠烈杨家将,1382749909
精武英雄-李连杰主演经典动作片,1382736873
赌神-发哥,1354889044
黑衣人1、2—动作喜剧大片,1354930936
毒液：致命守护者,1382745095
加勒比海盗系列,1382749914
银河护卫队-国外科幻巨作,1382736815
国外高分大片,1382736867
蝙蝠侠：侠影之谜,1382736719
太空荒野求生记-火星救援,1354930957
嫌疑人X的献身-悬疑,1382749953
科幻电影-环太平洋,1354936170
降魔传-神魔大战,1354932371
白鹿原-国内经典战争片,1354931488
史密斯夫妇-婚姻生活的童话演绎,1382736719
经典武侠电影-如来神掌,1382749944
海王-院线大片,1354936142
马丽主演戏剧片-东北虎,1354936199
章子怡主演-浮生如梦,1382735566
超燃科幻大片：明日边缘,1382736835
欧美配音电影！！！,1354693629
霹雳火：速度与激情,1382736895
多力特的奇幻冒险-和动物对话,1354930927
王牌特工：特工学院,1354936195
前任攻略：爱情喜剧,1354932409
无限复活-张柏芝主演爱情电影,1382745190
蚁人-微观世界大adventure,1382736913
洪金宝经典喜剧电影,1354889042
史诗级科幻电影-阿凡达,1382735577
热血抗日电影,1382749907
科幻佳片-银翼杀手2049,1354936136
诺兰影片-敦刻尔克大撤退,1382749910
沉睡魔咒-不一样的童话视觉,1382736849
不日成婚：婚恋喜剧,1354936214
鲛珠传-奇幻之旅,1354936231
红河谷-爱恨交响曲,1354936181
九层妖塔,1354936116
贫民窟的百万富翁,1382735561
爱情片合集-童梦奇缘,1354926622
一条狗的使命1,1382745092
缉魂-科幻悬疑电影,1382745090
调音师-旋律奇遇,1382749911
分手木马计,1354936228
郑恺主演运动喜剧-超越,1382736863
喜剧电影：冒牌天神1-2,1354936210
英伦犯罪喜剧-两杆大烟枪,1354658051
孙红雷古天乐主演犯罪动作片,1382735552
喜剧爱情电影：不期而遇,1382745181
古人踢足球，爆笑仙球大战,1354930945
经典科幻电影-2001漫游太空,1354926671
明日战记-科幻战争片,1354936221
果酱熊的萌愈之力-帕丁顿熊2,1382735627
张涵予主演犯罪动作大片,1382736865
伯爵的复仇之旅,1382735581
九龙不败-警匪动作片,1354933556
当爸爸变成我兄弟？,1382749887
重返青春-回到过去拥抱你,1382749940
疯狂一家秀,1382736715
不一样的花木兰传奇,1354930903

连续剧,#genre#
武林外传,1355652820
【水浒传】24h,1382702247
靓剑,1356043643
湸剑,23206872
纪晓岚,1354143978
每天都等你,1353215589
【狂飙2老默】首播,1354790484
弹幕天团下饭神剧,23512910
少年包青天,1356043677
神探狄仁杰1,1382851575
丸子,1382851588
地下交通站,1382736795
真实案件系列,1382671124
朵宝陪你看狄仁杰,1353753252
正阳门下,1354931580
小惠_郭德纲相声迷,1382851593
【新三国】萌儿陪看,29216766
内在美-伊人有约,1382737892
【靓剑】乐乐陪看,1352946111
赵本山《蓝光版》,32160832
神雕侠侣,1351762426
济公,1355265814
赵本山《超清版》,1382683959
8090年的热血与回忆,1356243352
超喜剧地下交通站男神贾贵,1353428972
隋唐英雄传,1352475619
古惑仔,1458015189
雯子：港剧,1456829119
雍正王朝,1356043620
燕双鹰,1352227153
【鹿鼎记】金庸经典,28265277
经典抗战剧,1354555195
《武林外传》武侠,1394000563
水浒传,1353873252
《仙侠》开局无敌了,29600150
康熙微服私访记,1352811698
狄仁杰,1351755386
勇敢的心~24经典好剧,1354744544
神医喜来乐,1382714119
热度榜1.包青天,22701868
83射雕英雄传,1354210357
薛仁贵传奇,1355260662
大家车言论,1382570702
好先生,79382500
鹿鼎记-高清全集,1382704650
宰相刘罗锅,1382745191
逋鞠盗-国产喜剧,1382736856
情满四合院-高分电视剧,1382735541
寻秦记-穿越剧经典,1382749900
西游记后传,1382736846
风筝,1382828770
每天都要快乐哦！,1354930909
少年包青天第三部,1382736814
智取威虎山,1382736843
少年包青天,1414846486
二号交通站,1382735582
小美美正在直播,1354143966
【鸡毛飞上天】,1354806550
林正英全集,1353685311
天龙神雕经典回忆,68260522
天龙八部,1351814644
24h七星鲁王宫,1355171357
小太阳正在直播,29067083
【经典港片】佟瑶,23531261
迷糊不迷糊正在直播,1461931969
燕双鹰,1354143942
倚天屠龙记,33300793
进来陪你看电视,1353518742
天龙神雕金庸,1356043609
甜心正在直播,1454732419
【武林客栈】,1382773728
新白娘子传奇,1354490667
【新三国】,1382851415
老妖私影院,1354952229
奇缘港台影院,1354889234
笑傲江湖4K超清,1354282410
经典电影重温,1382793140
豪哥带我们发财,23402146
无敌燕双鹰,1354825244
铁齿铜牙纪晓岚,1382781415
小爽东北菇凉，求守护,1382609850
YY用户,1382736808
啊咧,1459243913
神探狄仁杰2,1382828767
YY用户,1382736818
恋歌,1382746276
神探狄仁杰1,1354930934
情满四合院,1382736848
欢乐集结号-每天笑不停,1382741642
父母爱情,1354926650
新白娘子传奇-女神赵雅芝,1354930969
双月之城-国漫,1382736907
华子系列,1354888726
晨晨的影视小窝,1382851576
《石敢当》六耳猕猴,1394156613
颜值永远在线,1382851582
郝蕾演绎-情满四合院,1382745089
小兵张嘎,1354930225
都挺好-电视剧,1382736892
纯纯纯儿,1382851589
大家都在看的电视剧,1354930964
血色浪漫,1354926676
宝莲灯前传,1354931631
战狼10086,1382773686
暖暖1999,1382851591
金婚,1382736832
欢乐颂,1382851577
二号交通站,1354930965
欢乐颂,1382735624
恋歌,1382851594
鱼美美隋唐英雄传,1355102749
杭小妞,1382851590
24h我爱我家纯音频,1356212303
YY用户,1382745117
神探狄仁杰,38338029
国内高分悬疑剧-风筝,1354931585
情满四合院,1382851524
经典港片动作搞笑,1459869766
宰相刘罗锅,1353892468
活力满满,1382851585
保护我家蓉儿,1370293254
打王者看电影,1460889796
流行古装剧—知否知否应是绿肥红瘦,1354936134
快来呀好剧在等你,1331686180
【新三国】吕布,1382851459
【新三国】日版,1382851457
初恋脸,1382851597
爱笑仙子,1382736838
恐怖诡异墓穴,1382748585
鬼经典老片,1463783198
苍狼,1507704566
福贵,1354926537
法证先锋Ⅲ,1382736802
8090.电影一哥,29197808
和你不见不散,1355635293
西游记后传蓝光,1353392400
惊恐盗暮鬼怪,1382749525
军旅剧（回忆经典）,1356306672
电影电影电影电影电影电影,1351496216
父母的爱情,1382768483
少年歌行,1450556636
24小时循环播电视剧,53320802
探案！探案！,1382829413
三国演义94年经典版,1354936241
如沐春风,1382736810
炊事班的故事III,1382736716
天道-9.2高分好剧,1382735574
欢乐集结号,1354931582
读心神探,1382736875
寻秦记,1354658048
洪金宝福星系列,1354924839
妖神记,1382745171
炊事班的故事,1382749901
法证先锋,1354930939
变形金刚,1382736803
超英集结,1382745091
魔幻手机,1382735544
时光的海,1382736885
甜甜的恋爱这狗粮我吃了,1354932438
西游记张卫健版,1354936155
宫心计,1382828769
大汉贤后卫子夫,1382735569
金婚,1382828768
灌篮高手,1382735626
小师妹rua,1382736975
非常保镖-经典港剧,1382736903
开心小泡芙,1382851578
大进军全集：红色系列电影,1382745083
笑声传奇,1382736880
速度与激情系列！-精彩大片,1382736911
许多多,1382851583
北京爱情故事，心动不打烊,1382744423
我的体育老师,1382745169
陈情令,1382745121
YY用户,1382735572
仙剑奇侠传-神仙姐姐驾到,1382749903
农家小菜,1382736894
亲爱的热爱的,1354932433
抹茶少女,1382737888
易中天品三国,1354931498
哈利波特全集,1382745105
老广的味道第3季-美食纪录片,1382735565
少年包青天第三部,1382851540
欢乐一起看,1354930926
宫锁珠帘,1354926666
宫心计,1354932429
小敏,1382736890
港剧-警犬巴打,1354932397
你最爱的宋小宝,1354936198
动作大片-热血开打,1354936168
密子君,1382736717
我的前半生,1382735564
伪装者,1354936244
超燃警匪片,1382735576
法证先锋Ⅱ,1354888736
穿越时空的爱恋,1382735567
法证先锋2,1382736870
欢乐集结号,1382735550
发哥系列,1354888733
东海龙棺,1354930968
探秘中华美食,1354930954
杭小妞,1382736910
金玉满堂：精彩港剧,1382736881
高分科幻动作片,1382749948
苦乐村官,1382736864
人生必看的科幻片,1382745114
Blingbling,1382851598
最美的青春,1382745116
神探狄仁杰2,1382851146
回家的诱惑,1354658043
笑傲帮,1382735555
士兵突击,1382851600
辉煌或疯狂-韩剧,1382749902
院线动作大片,1382736900
无敌县令,1354932390
渴望,1354930963
小鬼当家-童年回忆,1382745104
欢乐集结号3,1382736822
YY用户,1382735578
转角遇到爱,1382745085
爆笑小品大合集,1382736821
上海滩,1382745184
这部剧你居然没看过？,1354932355
以家人之名,1382736908
妖神记之黑狱篇,1382745173
海洋幻梦-泰剧,1382749889
经典大片合集,1382749895
超精彩！系列动作电影,1382745096
野山鹰-影视剧,1354932395
重生之超级赛亚人,1354936124
复仇者联盟全季,1354936167
真心想让你幸福,1382736876
舌尖上的中国第2季,1354930943
TVB收视爆剧-溏心风暴,1382736916
心中的白月光,1382851580
岳云鹏宋小宝也来演电影了？,1354926612
非诚勿扰,1382735583
不可能的任务-碟中谍4,1354930967
闲暇观看综艺,1354932379
国产喜剧,1382735584
俺娘田小草,1382741638
铁齿铜牙纪晓岚,1382626335
非诚勿扰,1382745100
国外院线动作大片,1382735570
我爱我家,1382735557
缺宅男女,1354930937
宫心计-港剧-古装,1354933540
你的回忆有我吗,1354889024
舌尖上的中国第一季,1354930952
国内喜剧,1382735563
本山快乐营,1354933529
河伯的新娘：奇幻爱情,1354936
`;

let ID_NAME_MAP = {};
let CHANNELS = {};

(function initData() {
    const lines = RAW_DATA.trim().split('\n');
    let currentCategory = "默认";
    CHANNELS = {};
    ID_NAME_MAP = {};
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        if (line.includes('#genre#')) {
            currentCategory = line.split(',')[0];
            CHANNELS[currentCategory] = [];
        } else {
            const parts = line.split(',');
            if (parts.length >= 2) {
                const name = parts[0];
                const id = parts[1];
                CHANNELS[currentCategory].push({ name, id });
                ID_NAME_MAP[id] = name;
            }
        }
    });
})();

// ========== 工具函数 ==========
const log = (msg) => {
    OmniBox.log("info", `[YY] ${msg}`);
};

function getSmartKeyword(name) {
    if (!name) return "";
    const bracketMatch = name.match(/【([^】]+)】/);
    if (bracketMatch && bracketMatch[1]) {
        return bracketMatch[1].trim();
    }
    const splitMatch = name.split(/[-_]/);
    if (splitMatch.length > 1 && splitMatch[0].length > 1) {
        return splitMatch[0].trim();
    }
    return name.trim();
}

function parsePlaySources(sourceName, episodesStr) {
    const playSources = [];
    if (!episodesStr) return playSources;
    const episodes = episodesStr.split('#').map(item => {
        const [name, playId] = item.split('$');
        return { name: name || '正片', playId: playId || name };
    });
    if (episodes.length > 0) {
        playSources.push({ name: sourceName, episodes: episodes });
    }
    return playSources;
}

/**
 * 批量获取封面（优化版：提升并发，减少延迟）
 */
async function batchGetCovers(items) {
    const idToCover = {};
    
    if (!items || items.length === 0) {
        return idToCover;
    }
    
    const keywords = [...new Set(items.map(item => getSmartKeyword(item.name)))];
    
    log(`批量获取封面：${items.length}个频道，${keywords.length}个关键词`);
    const startTime = Date.now();
    
    // 提升并发数到5
    for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
        const chunk = keywords.slice(i, i + BATCH_SIZE);
        
        await Promise.all(chunk.map(async (keyword) => {
            try {
                const searchApi = `https://www.yy.com/apiSearch/doSearch.json?q=${encodeURIComponent(keyword)}&t=120&n=1&s=0`;
                
                const res = await axios.get(searchApi, {
                    headers: { 
                        'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        'Referer': `https://www.yy.com/search?target=${encodeURIComponent(keyword)}&type=120`,
                        'Cookie': FAKE_COOKIE,
                        'Accept': 'application/json, text/plain, */*'
                    },
                    timeout: SEARCH_TIMEOUT
                });
                
                const data = res.data;
                if (data?.success && data.data?.searchResult?.response) {
                    const docs = data.data.searchResult.response['120']?.docs;
                    if (docs && docs.length > 0) {
                        docs.forEach(doc => {
                            const id = doc.sid || doc.ssid;
                            const pic = doc.posterurl || doc.headurl;
                            if (id && pic) {
                                idToCover[id] = pic;
                            }
                        });
                    }
                }
            } catch (e) {
                // 忽略单个请求失败
            }
        }));
        
        // 减少延迟到100ms
        if (i + BATCH_SIZE < keywords.length) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
    }
    
    const elapsed = Date.now() - startTime;
    log(`批量获取完成：${Object.keys(idToCover).length}个封面，耗时${elapsed}ms`);
    return idToCover;
}

// ========== 接口实现 ==========

async function home(params) {
    let classes = Object.keys(CHANNELS).map(key => ({
        'type_id': key,
        'type_name': key
    }));
    return { class: classes, list: [] };
}

async function category(params) {
    const tid = params.categoryId || params.type_id;
    const page = parseInt(params.page) || 1;
    const items = CHANNELS[tid] || [];
    
    const total = items.length;
    const pagecount = Math.ceil(total / PAGE_SIZE);
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageItems = items.slice(start, end);
    
    log(`分类[${tid}] 第${page}/${pagecount}页，${pageItems.length}个频道`);
    
    // 批量获取当前页的封面
    const idToCover = await batchGetCovers(pageItems);
    
    let list = pageItems.map(item => {
        const pic = idToCover[item.id] || DEFAULT_PIC;
        return {
            "vod_id": `${item.id}|||${pic}`,
            "vod_name": item.name,
            "vod_pic": pic,
            "vod_remarks": "Live",
        };
    });
    
    return { 
        list, 
        page: page, 
        pagecount: pagecount, 
        limit: PAGE_SIZE, 
        total: total 
    };
}

async function search(params) {
    return { list: [] };
}

async function detail(params) {
    log(`========== 详情请求 ==========`);
    
    let videoId = params.videoId;
    let cachedPic = null;
    
    if (videoId.includes('|||')) {
        const parts = videoId.split('|||');
        videoId = parts[0];
        cachedPic = parts[1];
        log(`ID=${videoId}，复用封面`);
    }
    
    const id = videoId;
    let realName = ID_NAME_MAP[id] || `YY直播:${id}`;
    let realPic = cachedPic || DEFAULT_PIC;
    let foundSource = cachedPic ? "缓存" : "默认";

    // 如果没有缓存封面，才去搜索
    if (!cachedPic) {
        try {
            const searchKeyword = getSmartKeyword(realName);
            const searchApi = `https://www.yy.com/apiSearch/doSearch.json?q=${encodeURIComponent(searchKeyword)}&t=120&n=1&s=0`;
            
            const res = await axios.get(searchApi, {
                headers: { 
                    'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    'Referer': `https://www.yy.com/search?target=${encodeURIComponent(searchKeyword)}&type=120`,
                    'Cookie': FAKE_COOKIE
                },
                timeout: 3000
            });

            const data = res.data;
            
            if (data?.success && data.data?.searchResult?.response) {
                const docs = data.data.searchResult.response['120']?.docs;
                
                if (docs && docs.length > 0) {
                    const targetDoc = docs.find(doc => doc.sid == id || doc.ssid == id);
                    
                    if (targetDoc) {
                        if (targetDoc.posterurl) {
                            realPic = targetDoc.posterurl;
                            foundSource = "搜索API";
                        } else if (targetDoc.headurl) {
                            realPic = targetDoc.headurl;
                            foundSource = "搜索API";
                        }
                    }
                }
            }

            // 降级策略
            if (foundSource === "默认") {
                const pcUrl = `https://www.yy.com/${id}`;
                try {
                    const pcRes = await axios.get(pcUrl, {
                        headers: { 
                            'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                            'Cookie': FAKE_COOKIE
                        },
                        timeout: 3000
                    });
                    
                    const html = pcRes.data;
                    const coverRegex = /individuationCover["']?\s*[:=]\s*["']?(http[^"']+(?:jpg|png|jpeg))/i;
                    const coverMatch = html.match(coverRegex);
                    
                    if (coverMatch && coverMatch[1]) {
                        realPic = coverMatch[1].replace(/\\/g, "");
                        foundSource = "PC源码";
                    }
                } catch (pcErr) {}
            }

        } catch (e) {
            log(`封面获取失败: ${e.message}`);
        }
    }

    const playUrlStr = QUALITY_CONFIG.generatePlayUrl(id);
    const playSources = parsePlaySources("YY高清", playUrlStr);
    
    log(`${realName} | 来源:${foundSource}`);

    return {
        list: [{
            "vod_id": id,
            "vod_name": realName,
            "vod_pic": realPic,
            "vod_play_sources": playSources,
            "vod_content": `主播：${realName}\nID：${id}\n来源：${foundSource}\n详情页：https://www.yy.com/${id}`,
            "vod_remarks": "直播中"
        }]
    };
}

async function play(params) {
    const { id: rid, quality } = QUALITY_CONFIG.parseQuality(params.playId);
    const qualityName = QUALITY_CONFIG.options.find(q => q.bitrate === quality)?.name || "未知";
    
    log(`播放 ID=${rid} 画质=${qualityName}`);
    
    const headers = {
        "Referer": "https://wap.yy.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    };
    
    const url = `https://interface.yy.com/hls/new/get/${rid}/${rid}/${quality}?source=wapyy&callback=jsonp3`;
    
    try {
        const res = await axios.get(url, { headers: headers, timeout: 8000 });
        const content = res.data.toString();
        
        const match = content.match(/jsonp3\(([\s\S]*?)\)/);
        if (match && match[1]) {
            const json = JSON.parse(match[1]);
            
            if (json.hls) {
                log(`✅ 播放成功: ${json.hls}`);
                return { parse: 0, url: json.hls, header: headers };
            } else {
                log(`❌ 无hls字段: ${JSON.stringify(json)}`);
            }
        } else {
            log(`❌ 响应格式错误: ${content.substring(0, 200)}`);
        }
    } catch (e) {
        log(`❌ 播放失败: ${e.message}`);
    }
    
    return { error: "未获取到播放地址" };
}

module.exports = { home, category, search, detail, play };

if (typeof require !== 'undefined' && require.main === module) {
    const runner = require("spider_runner");
    runner.run(module.exports);
}
