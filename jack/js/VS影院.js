var rule={
            title: 'VS影院‖小司机',
            host: 'https://www.91doutu.com',
            homeUrl:'/',
            url: '/fyfilter.html',
            searchUrl: '/search/?wd=**',
            searchable: 2,//是否启用全局搜索,
            quickSearch: 1,//是否启用快速搜索,
            filterable: 1,//是否启用分类筛选,
            headers: {//网站的请求头,完整支持所有的,常带ua和cookies
                'User-Agent': 'MOBILE_UA',
                // "Cookie": "searchneed=ok"
            },
            /*class_name:'电视剧&电影&动漫&综艺&短剧',
 class_url:'dianshiju&dianying&dongman&zongyi&dj',*/
            filter_url:'{{fl.cateId}}/index-fypage',
            filter:{
            "dianying":[{"key":"cateId","name":"分类","value":[{"n":"全部","v":"dianying"},{"n":"动作片","v":"dongzuopian"},{"n":"爱情片","v":"aiqingpian"},{"n":"科幻片","v":"kehuanpian"},{"n":"恐怖片","v":"kongbupian"},{"n":"喜剧片","v":"xijupian"},{"n":"剧情片","v":"juqingpian"},{"n":"战争片","v":"zhanzhengpian"},{"n":"纪录片","v":"jilupian"},{"n":"动画片","v":"donghuapian"}]}],
            "dianshiju":[{"key":"cateId","name":"分类","value":[{"n":"全部","v":"dianshiju"},{"n":"国产剧","v":"guocanju"},{"n":"香港剧","v":"xianggangju"},{"n":"欧美剧","v":"oumeiju"},{"n":"日本剧","v":"ribenju"},{"n":"海外剧","v":"haiwaiju"},{"n":"台湾剧","v":"taiwanju"},{"n":"韩国剧","v":"hanguoju"},{"n":"泰国剧","v":"taiguoju"}]}]
    },
           filter_def:{
        dianying:{cateId:'dianying'},
        dianshiju:{cateId:'dianshiju'},
        zongyi:{cateId:'zongyi'},
        dongman:{cateId:'dongman'},
        dj:{cateId:'dj'}
    },
            class_parse: '.nav&&li:gt(0):lt(6);a&&Text;a&&href;/(\\w+)/',
            play_parse: true,
            lazy: '',
            limit: 6,
            推荐: 'body&&.w6;a&&title;.lazyload&&data-original;.sname&&Text;a&&href',
            double: false, // 推荐内容是否双层定位
            一级: 'body&&.w8;a&&title;.lazyload&&data-original;.sname&&Text;a&&href',
            二级: {
                "title": "h1&&Text",
                "img": ".lazyload&&data-original",
                "desc": ".vod-info:eq(1)&&Text;.vod-info:eq(2)&&Text;.vod-info:eq(3)&&Text",
                "content": ".detail-info&&Text",
                "tabs": ".vod-player&&li",
                "lists": ".fade-in:eq(#id) a:not(:contains(APP秒播))"
            },
            搜索: 'body .module-item;.module-card-item-title&&Text;.lazyload&&data-original;.module-item-note&&Text;a&&href;.module-info-item-content&&Text',
        }