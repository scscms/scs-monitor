//功能：前端监控vue插件

const monitor = (function(W,D) {
    if(!navigator.sendBeacon){
        return {
            init:function(){},
            push:function(){},
            beacon:function(){}
        }
    }
    const F = {
        code: 'miniOMS', // 上报的code标识
        uin: '', // 用户
        key:'monitor',//localStorage key
        url:'http://localhost:8000/api/beacon', //上报接口(默认不应该修改)
        ignore: [], // 忽略某些关键词错误, 支持String或Regexp
        random: 1 // 抽样 (0-1] 1-全量
    };
    const T = {
        isType: function (o, type) {
            return Object.prototype.toString.call(o) === "[object " + (type || "Object") + "]";
        },
        getStorage:function(){
            let arr;
            try{
                arr = JSON.parse(localStorage.getItem(F.key));
            }catch (e){}
            return T.isType(arr,'Array') ? arr : [];
        },
        isIgnore:function(msg){
            //必须有title和info属性,然后才抽样
            let ignore = msg.title && msg.info ? F.random <= Math.random() : true;
            if(!ignore){
                //处理一下数据
                msg.title = msg.title.substring(0,200);
                msg.url = (msg.url||W.location.href).substring(0,200);
                msg.occurrence = Date.now();
                msg.amount = 1;
                if(!Number.isInteger(msg.info)||!msg.title.startsWith('API:')){
                    msg.title = msg.title.replace(/API:/g,'');//过滤非法字符
                    msg.info = msg.info.toString().substring(0,200);
                }
                if (T.isType(F.ignore, "Array")) {
                    for (let i = F.ignore.length;i--;) {
                        let _s = F.ignore[i];
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
    const monitor = {
        //初始化配置
        init: function(config) {
            if(T.isType(config)){
                for (const key in config) {
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
            const arr = T.getStorage();
            let has = false;//判断缓存中是否有相同的错误，有就累加1，没就存入缓存
            for(let i = arr.length;i--;){
                if(arr[i].title === msg.title){
                    has = true;
                    if(msg.hasOwnProperty('average')){
                        arr[i].info.push(msg.average);
                    }else{
                        arr[i].amount ++;
                    }
                    break;
                }
            }
            !has && arr.push(msg);
            localStorage.setItem(F.key,JSON.stringify(arr));
        },
        //开始上报
        beacon:function(msg){
            const isObj = T.isType(msg);
            let arr = T.getStorage();
            if(isObj){
                if(T.isIgnore(msg))return;//不在抽样范围内或是忽略的错误
                arr = [msg];
            }
            arr.forEach(o=>{
                if(o.title.startsWith('API:')){
                    o.amount = o.info.reduce((a,v)=>a+v,0)/o.info.length >> 0;//求平均值
                    o.info = o.info.join();
                }
            });
            if(arr.length){
                //如果全量上报且上报成功，删除缓存
                navigator.sendBeacon(F.url,JSON.stringify({code:F.code,uin:F.uin,list:arr})) && !isObj && localStorage.removeItem(F.key);
            }
        }
    };
    W.onerror = function(msg, url, line, col, error) {
        if(msg === 'Script error.')return;//忽略第三方js链接文件错误
        monitor.push({
            title: msg,
            url: url,
            info: 'line:' + line + 'col:' + col
        });
    };
    const _w = D.write;//备用方法
    const _i = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
    const fun = (d, t) => {
        if(typeof d === "object"){
            d.nodeName === "SCRIPT" && d.src && monitor.push({
                title: t + ' SCRIPT',
                info: d.outerHTML
            });
        }else{
            let reg = d.toString().match(/(<script[^>]+?src=[^<]+?<\/script>)/gi);
            reg && monitor.push({
                title: t + ' SCRIPT',
                info: reg[0]
            });
        }
    };
    D.write = D.writeln = str => {
        _w.call(D, str);fun(str,'Document.write');
    };
    Object.defineProperty(Element.prototype, "innerHTML", {
        set: function (str) {
            _i.set.call(this, str);fun(str,'innerHTML');
        }
    });
    if (MutationObserver) {
        const observer = new MutationObserver(m => {
            m.forEach(n => {
                n.type === "childList" ? n.addedNodes.forEach(t => fun(t, 'append')) : fun(n.target, 'modify')
            });
        });
        observer.observe(D, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeOldValue: true,
            attributesFilter: ["src"]
        });
    }
    return monitor;
}(window,document));

export default {
    install: function(Vue) {
        if (typeof process === 'undefined' || process.browser) {
            Vue.config.errorHandler = function (err, vm, info) {
                let name = 'root instance';
                if (vm.$root !== vm) {
                    name = vm._isVue ? vm.$options.name || vm.$options._componentTag : vm.name;
                    name = (name ? 'component <' + name + '>' : 'anonymous component') + (vm._isVue && vm.$options.__file ? ' at ' + vm.$options.__file : '');
                }
                monitor.push({
                    title:`VUE组件：${name} 源自：${info} 错误`,
                    info: err.message ? err.name + ':' + err.message : err
                });
            };
            Object.defineProperty(Vue.prototype, '$monitor', { value: monitor });
        }
    }
}
