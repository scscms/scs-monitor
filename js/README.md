# 前端监控系统<sup>monitor</sup>上报插件

### 上报方法

#### 初始化init

```
monitor.init({
        code: 'scscms', // 上报的code标识
        uin: '', // 用户标识
        key:'monitor',//localStorage key
        url:'http://localhost:8000/api/beacon', //上报接口（beacon或report）
        ignore: [], // 忽略某些关键词错误, 支持String或Regexp
        random: 1 // 抽样 (0-1] 1-全量
    })
```

- code:就是监控网站标识，让后台知道是哪个网站上报的错误。请参见server/common.js  sort_type配置
- uin:被监控网站所登录的用户（可选），为方便追踪错误来源及还原bug操作。
- key:存储localStorage的key，可任意修改。
- url:上报日志地址（重要）
- ignore:忽略某些关键词错误, 支持String或Regexp。
- random:抽样上报(0-1] 1-全量。

#### 新增队列日志

```
monitor.push({
            title: '错误标题',
            info: '错误详情',
            url:'错误来源页（可选）为空时自动取location.href值'
        })
```

#### 立刻上报日志beacon方法
```
monitor.beacon(obj?)
```

#### 立刻上报日志report方法
```
monitor.report(obj?)
```

#### beacon和report方法说明

两种方法参数一样（需要上报的一条日志，可选），当有参数时只上报此错误日志，无参数时上报所有队列日志。
report使用的是iframe表单形式上报日志，兼容所有浏览器。beacon使用的是浏览器[navigator.sendBeacon](https://developer.mozilla.org/zh-CN/docs/Web/API/Navigator/sendBeacon)接口，不支持IE等低版本浏览器。具有不阻塞网站加载效果，环保卫生。

---

### vue版本vue_monitor.js
- 不支持report()方法；
- 浏览器不支持navigator.sendBeacon将无法使用；

#### 使用方法：

```
import monitor from './js/vue_monitor'
Vue.use(monitor);
```

```
mounted(){
	this.$monitor.push({
        title:'test日志',
        info:'测试日志'
    });
}

```
然后要在适当的位置调用`this.$monitor.beacon();`建议在用户退出操作里。

### 普通js版本js_monitor.js

- 兼容所有浏览器，在不支持navigator.sendBeacon的浏览器下调用beacon()将会自动转调report()；

#### 使用方法：

```
import './js/js_monitor'
```
或&lt;script src="js/js_monitor.js"&gt;&lt;/script&gt;

```
MONITOR.push({
        title: '错误标题',
        info: '错误详情',
        url:'错误来源页（可选）为空时自动取location.href值'
    })
```
即MONITOR为全局变量。