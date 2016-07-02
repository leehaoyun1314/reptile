(function() {
    // 定义变量
    var superagent = require('superagent');
    var observe = require('observe.js');
    var cheerio = require('cheerio');
    var path = require('path');
    var url = require('url');
    var fs = require('fs');
    var filename = 'postList';
    // 以同步的方式：判断是否存在这个文件夹，不存在创建
    if (!fs.existsSync(filename)) {
        fs.mkdirSync(filename);
    }
    // 获取当前路径，方便读写目录根文件
    var cwd = process.cwd();
    // 创建单例
    var reptile = observe({});
    // 查询过的地区
    var urls = ['?id=000000000000'];
    // 侦听属性
    reptile.on({
        // 根据 url，获取text
        url: function(url) {
            var that = this;
            // get方法发出请求，query方法为url添加query字段（url问号背后的）
            // end 方法接受回调参数，html一般在res.text中
            superagent.get(url).query(this.query).end(function(err, res) {
            	// for(var index in arguments){
            	// 	console.log(arguments[index]);
            	// }
                if (err) {
                    console.log('返回数据出错：' + err);
                    return;
                }
                if (res.ok) {
                    // 赋值给reptile.text，就会触发回调
                    that.text = res.text;
                }
            });
        },
        // 触发的回调函数在这里
        text: function(text) {
            var that = this;
            // cheerio的load方法返回的对象，拥有与jQuery相似的API
            var $ = cheerio.load(text);
            var postList = [];

            $('a[href^="?id="]').each(function() {
                var href = $(this).attr('href');
                // 对符合条件的 a 标签进行遍历，如果 a 标签的地址和查询条件一样，则退出本次循环（防止死循环）
                if (urls.indexOf(href) >= 0) {
                    return;
                }
                postList.push({
                    title: $(this).text(),
                    url: that.url + href,
                    href: href
                });
            });
            // 赋值就触发回调
            that.postList = postList;
            that.postItem = postList.shift();
        },
        // 在这个回调里发出每一个地址的请求
        postItem: function(postItem) {
            // 判断是否已经请求过该地址
            if (urls.indexOf(postItem.href) >= 0) {
                return;
            }
            console.log(postItem.url);
            var that = this;
            superagent.get(postItem.url).end(function(err, res) {
                if (err) {
                    console.log('返回数据出错：' + err);
                    return;
                }
                if (res.ok) {
                    urls.push(postItem.href);
                    // 在这里构造filename，指定了具体路径
                    that.content = {
                        filename: path.join(cwd, filename, postItem.title + new Date().getMilliseconds() + '.txt'),
                        text: res.text
                    };
                } else {
                    console.log(res);
                }
            });
        },
        // 每个地址的具体内容
        content: function(content) {
            var that = this;
            var $ = cheerio.load(content.text);
            var data = '';
            // 根据html结构选取所有包含地名的a标签
            $('a[href^="?id="]').each(function() {
                data += $(this).text() + '\r\n';
                var href = $(this).attr('href');
                // 判断是否已经请求过该地址
                if (urls.indexOf(href) >= 0) {
                    return;
                }
                that.postList.push({
                    title: $(this).text(),
                    url: that.url + href,
                    href: href
                });
            });
            // 前面已经构造好了文件路径，直接写入即可
            fs.writeFile(content.filename, data, function(err) {
                if (err) {
                    console.log(err);
                } else if (that.postList.length) {
                    // 写入完毕后，检查postList还有没有剩余
                    // 若有，取出来赋值给postItem，有goto到请求地址的步骤
                    that.postItem = that.postList.shift();
                }
            });
        }
    });
    // 初始化爬虫单例
    reptile.url = 'http://api.dangqian.com/apidiqu2/apiyanshi.asp';//'http://area.boyed.com';//
    reptile.query = 'id=000000000000';
})();
