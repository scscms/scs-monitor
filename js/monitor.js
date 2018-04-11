/**
 * 高版本浏览器使用：Chrome39+ Edge Firefox(31) Opera(26) 即必须支持navigator.sendBeacon
 */
const monitor = (function(W,D) {
    const F = {
        code: '', // 上报的code标识
        uin: '', // 用户
        key:'monitor',//localStorage key
        url:'http://localhost:8000/api/beacon', //上报接口(默认不应该修改)
        ignore: [], // 忽略某些关键词错误, 支持String或Regexp
        random: 1 // 抽样 (0-1] 1-全量
    };
    if(!navigator.sendBeacon){
        return {
            init(){return F},
            push(){},
            beacon(){}
        }
    }
    const T = {
        isType(o, type) {
            return Object.prototype.toString.call(o) === "[object " + (type || "Object") + "]";
        },
        getStorage(){
            let arr;
            try{
                arr = JSON.parse(localStorage.getItem(F.key));
            }catch (e){}
            return T.isType(arr,'Array') ? arr : [];
        },
        isIgnore(msg){
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
        init(config) {
            if(T.isType(config)){
                for (const key in config) {
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
            return F
        },
        //先缓存不上报
        push(msg){
            if(!T.isType(msg)||T.isIgnore(msg)){
                return;//参数必须是对象,同时在抽样范围内
            }
            const arr = T.getStorage();
            let has = false;//判断缓存中是否有相同的错误，有就累加1，没就存入缓存
            for(let i = arr.length;i--;){
                if(arr[i].title === msg.title){
                    has = true;
                    if(msg.title.startsWith('API:')){
                        arr[i].info.push(msg.info);
                    }else{
                        arr[i].amount ++;
                    }
                    break;
                }
            }
            if(!has){
                if(msg.title.startsWith('API:')){
                    msg.info = [msg.info];
                }
                arr.push(msg);
            }
            localStorage.setItem(F.key,JSON.stringify(arr));
        },
        //开始上报
        beacon(msg){
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
    W.addEventListener('error',(msg, url, line, col)=>{
        msg = typeof msg === 'object'? msg.message:msg;
        if(msg === 'Script error.')return;//忽略第三方js链接文件错误
        monitor.push({
            title: msg,
            url: url,
            info: 'line:' + line + 'col:' + col
        });
    },!1);
    const _w = D.write;//备用方法
    const _i = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
    const fun = (d, t) => {
        if(typeof d === "object"){
            if(d.nodeName === "SCRIPT"){
                //todo 排除部分文件
                if (d.src && !d.src.includes('.qq.com/') && !d.src.includes('.hot-update.js')) {
                    monitor.push({
                        title: t + ' '+ d.tagName,
                        info: d.outerHTML
                    });
                }
            }
        }else{
            let reg = d.toString().match(/<script[^>]+?src=[^<]+?<\/script>/gi);
            reg && monitor.push({
                title: t + ' SCRIPT',
                info: reg.join()
            });
        }
    };
    D.write = D.writeln = str => {
        _w.call(D, str);fun(str,'Document.write');
    };
    Object.defineProperty(Element.prototype, "innerHTML", {
        set (str) {
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

if (typeof module !== "undefined") {
    module.exports = monitor;
}
