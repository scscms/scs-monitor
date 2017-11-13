/**
 * Created by 10057959 on 2017/10/17.
 */

var MONITOR = (function(W) {
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
            //处理一下数据
            msg.title = msg.title.substring(0,200);
            msg.info = msg.info.substring(0,200);
            msg.url = (msg.url||location.href).substring(0,200);
            msg.occurrence = Date.now();
            msg.amount = 1;//累计错误次数
            if (!ignore && T.isType(F.ignore, "Array")) {
                for (var i = F.ignore.length;i--;) {
                    var _s = F.ignore[i];
                    if (T.isType(_s, "RegExp") && _s.test(msg.title) || T.isType(_s, "String") && msg.title.includes(_s)) {
                        ignore = true;
                        break;
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
                    arr[i].amount ++;
                    break;
                }
            }
            !has && arr.push(msg);
            localStorage.setItem(F.key,JSON.stringify(arr));
        },
        //开始上报
        beacon:function(msg){
            if(!navigator.sendBeacon){
                F.url = F.url.replace('beacon','report');
                return W.MONITOR.report(msg);
            }
            var isObj = T.isType(msg);
            var arr = T.getStorage();
            if(isObj){
                if(T.isIgnore(msg))return;//不在抽样范围内或是忽略的错误
                arr = [msg];
            }
            if(arr.length){
                //如果全量上报且上报成功，删除缓存
                navigator.sendBeacon(F.url,JSON.stringify({code:F.code,uin:F.uin,list:arr})) && !isObj && localStorage.removeItem(F.key);
            }
        },
        //兼容性上报(兼容IE)
        report:function(msg){
            var isObj = T.isType(msg);
            var arr = T.getStorage();
            if(isObj){
                if(T.isIgnore(msg))return;//不在抽样范围内或是忽略的错误
                arr = [msg];
            }
            if(arr.length){
                var createInput = function(name,value,fam){
                    var input = document.createElement("input");
                    input.type = "hidden";
                    input.name = name;
                    input.value = value;
                    fam.appendChild(input);
                };
                var iframe = document.createElement("iframe");
                iframe.style.display = "none";
                iframe.name = "scs" + Math.random().toString(16).slice(-8);
                iframe.src = "javascript:false;";
                var form = document.createElement("form");
                var _c = 0;
                form.method = "POST";
                form.target = iframe.name;
                form.action = F.url.replace('beacon','report');
                document.body.appendChild(form);
                iframe.onload = function (){
                    if(++_c === 2){
                        !isObj && localStorage.removeItem(F.key);//清空数据
                        document.body.removeChild(iframe);
                        document.body.removeChild(form);
                    }
                };
                document.body.appendChild(iframe);
                var fragment = document.createDocumentFragment();
                createInput("code", F.code,fragment);
                createInput("uin", F.uin,fragment);
                arr.forEach(function(obj){
                    createInput("title", obj.title,fragment);
                    createInput("amount", obj.amount,fragment);
                    createInput("info", obj.info,fragment);
                    createInput("occurrence", obj.occurrence,fragment);
                    createInput("url", obj.url,fragment);
                });
                form.appendChild(fragment);
                form.submit();
            }
        }
    };
}(window));
if (typeof module !== "undefined") {
    module.exports = MONITOR;
}
