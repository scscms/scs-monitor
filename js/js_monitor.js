/**
 * Created by 10057959 on 2017/10/17.
 */

module.exports = (function(W) {
    var G = W.MONITOR;
    if (G) return G;
    var F = {
        code: '', // 上报的code标识
        uin: '', // 用户
        key:'monitor',//localStorage key
        url:'http://localhost:8000/api/report', //上报接口(默认不应该修改)
        ignore: [], // 忽略某些关键词错误, 支持String或Regexp
        random: 1 // 抽样 (0-1] 1-全量
    };
    var T = {
        isType: function (o, type) {
            return Object.prototype.toString.call(o) === "[object " + (type || "Object") + "]";
        },
        getStorage:function(){
            var arr;
            try{
                arr = JSON.parse(localStorage.getItem(F.key));
            }catch (e){}
            return T.isType(arr,'Array') ? arr : [];
        },
        isIgnore:function(msg){
            //必须有title和info属性,然后才抽样
            var ignore = msg.title && msg.info ? F.random <= Math.random() : true;
            if(!ignore){
                //处理一下数据
                msg.title = msg.title.substring(0,200);
                msg.url = (msg.url||location.href).substring(0,200);
                msg.occurrence = Date.now();
                msg.amount = 1;
                if(isNaN(msg.info)||!/^API:/.test(msg.title)){
                    msg.title = msg.title.replace(/API:/g,'');//过滤非法字符
                    msg.info = msg.info.toString().substring(0,200);
                }
                if (T.isType(F.ignore, "Array")) {
                    for (var i = F.ignore.length;i--;) {
                        var _s = F.ignore[i];
                        if (T.isType(_s, "RegExp") && _s.test(msg.title) || T.isType(_s, "String") && msg.title.includes(_s)) {
                            ignore = true;
                            break;
                        }
                    }
                }
            }
            return ignore;
        }
    };
    W.onerror = function(msg, url, line, col, error) {
        if(msg === 'Script error.')return;//忽略第三方js链接文件错误
        W.MONITOR.push({
            title: msg,
            url: url,
            info: 'line:' + line + 'col:' + col
        });
    };
    return W.MONITOR = {
        //初始化配置
        init: function(config) {
            if(T.isType(config)){
                for (var key in config) {
                    if(config.hasOwnProperty(key)){
                        F[key] = config[key];
                    }
                }
            }
            //判断条件自动上报
            let l = localStorage.getItem(F.key+'_Date');
            let t = new Date().toDateString();
            /\d/.test(l) && l !== t && this.beacon();
            localStorage.setItem(F.key+'_Date',t);
        },
        //先缓存不上报
        push:function(msg){
            if(!T.isType(msg)||T.isIgnore(msg)){
                return;//参数必须是对象,同时在抽样范围内
            }
            var arr = T.getStorage();
            var has = false;//判断缓存中是否有相同的错误，有就累加1，没就存入缓存
            for(var i = arr.length;i--;){
                if(arr[i].title === msg.title){
                    has = true;
                    if(/^API:/.test(msg.title)){
                        arr[i].info.push(msg.info);
                    }else{
                        arr[i].amount ++;
                    }
                    break;
                }
            }
            if(!has){
                if(/^API:/.test(msg.title)){
                    msg.info = [msg.info];
                }
                arr.push(msg);
            }
            localStorage.setItem(F.key,JSON.stringify(arr));
        },
        //开始上报
        beacon:function(msg){
            var isObj = T.isType(msg);
            var arr = T.getStorage();
            if(isObj){
                if(T.isIgnore(msg))return;//不在抽样范围内或是忽略的错误
                arr = [msg];
            }
            arr.forEach(o=>{
                if(/^API:/.test(o.title)){
                    o.amount = o.info.reduce((a,v)=>a+v,0)/o.info.length >> 0;
                    o.info = o.info.join();
                }
            });
            if(arr.length){
                //如果全量上报且上报成功，删除缓存
                navigator.sendBeacon(F.url,JSON.stringify({code:F.code,uin:F.uin,list:arr})) && !isObj && localStorage.removeItem(F.key);
            }
        }
    };
}(window));

if (typeof module !== "undefined") {
    module.exports = MONITOR;
}