# 前端监控系统<sup>monitor</sup>上报插件V3.1.0

	新增防劫持功能，加入图表展示。

### 使用方法

在网站中优先引入链接：
```
<script type="text/javascript" src="monitorES5.js"></script>
```
基本配置可在 `javaScript` 文件内写好即可。至此前端监控就可自动上报信息。

#### 初始化init

如果中途需要修改配置，可调用 `init` 方法。
```
monitor.init({
    random: location.hostname === 'localhost' ? 0 : 1, // 抽样上报[0-1] 1:100%上报,0:关闭上报。
    code: 'monitor', // 后台监控项目相应的编码（必配置）。
    url:'http://localhost:8000/api/beacon', //上报接口（必配置）,
    uin: '', // 被监控网站所登录的用户（可选），为方便追踪错误来源。也要警防用户信息泄漏。,
    ignore: [], // 忽略某些关键词错误, 支持String或Regexp
    hostList:[location.host,'qq.com'], //host白名单（非数组表示不过滤）
    pathname:['/','/index.html'],//需要性能测试的页面，必须数组一般只统计首页。
})
```

> random指前端的抽样上报。后端同样有日志和性能上报抽样配置。入库的机率等于两者相乘。
> code标识必须与网站中的`监控项目`中有相应配置，否则后台不保存数据。

##### 手动新增日志

```
monitor.push({
    title: '错误标题',
    info: '错误详情',
    url:'错误来源页（可选）为空时自动取location.href值'
})
```
##### 捕捉console日志：

```
console.log('一条日志');
console.warn('一条警告');
console.error('一条错误');
throw Error("手动抛出错误");
//以上方法都会监听并上报日志

console.info('一条信息');//没有监听此函数，不想被上报的信息建议使用此方法。
```
注意：此处默认获取js自身错误。如果需要手动抛出错误，请使用`throw Error("something");`而不要使用`throw "something";`。而vue内部做了处理，两都都可以捕获到。


---

### vue版本vue_monitor.js

#### 使用方法：

```
import monitor from './js/vue_monitor'
Vue.use(monitor);
```

#### 调用方法：

参考上面的方法，同时vue内部可以通过`this.$monitor`访问上报对象。

示范例子请查看`tests`目录。

