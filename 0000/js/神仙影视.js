var rule={
		title:'神仙影视',
		host:'http://kdy.sxtv.top/',
    url:'/index.php/vod/show/id/fyclass/page/fypage.html',
 		searchUrl:'/index.php/vod/search/page/fypage/wd/**.html',
		searchable:2,//是否启用全局搜索,
		quickSearch:1,//是否启用快速搜索,
	//	url:'/show/fyfilter.html',
    filterable:0,//是否启用分类筛选,
    
    
    
		//class_parse:'.nav-menu-items&&li;a&&Text;a&&href;.*/(.*?).html',
	        //cate_exclude:'演员',
	        class_name:'电影&电视剧&综艺&动漫&短剧',//静态分类名称拼接
 //   电影$20#电视剧$21#动漫$22#短剧$25#综艺$23#体育$24#纪录片$26
    class_url:'20&21&23&22&25',//静态分类标识拼接
	
		play_parse:true,
		lazy:'',
		limit:6,
		推荐:'.module-list;.module-items&&.module-item;a&&title;img&&data-src;.module-item-text&&Text;a&&href',
		double:true, // 推荐内容是否双层定位
		一级:'.module-items .module-item;a&&title;img&&data-src;.module-item-text&&Text;a&&href',
		
		二级:{
		"title":"h1&&Text;.tag-link&&Text",
		"img":".module-item-pic&&img&&data-src",
		"desc": ".video-info-items:eq(4)&&Text;.video-info-items:eq(2)&&Text;;.video-info-items:eq(1)&&Text;.video-info-items:eq(0)&&Text;.video-info-items:eq(3)&&Text;"
		,
		"content":".video-info-items:eq(6)&&.video-info-item&&Text",
		"tabs":".module-tab-item",
		"lists":".module-player-list:eq(#id)&&.scroll-content&&a"},
		搜索:'.module-items .module-search-item;h3&&Text;*;.video-serial&&Text;*',
}
