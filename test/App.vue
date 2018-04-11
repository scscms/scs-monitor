<template>
    <div id="app">
        <button type="button" @click="fun('err')">捕捉错误</button>
        <button type="button" @click="fun('log')">插入日志</button>
        <button type="button" @click="fun('api')">API耗时</button>
        <button type="button" @click="fun('append')">插入外链</button>
        <button type="button" @click="fun('beacon')">批量上报</button>
        <button type="button" @click="fun('clear')">清空缓存</button>
        <span>{{type}}</span>
        <div style="margin-top: 10px">
            <textarea name="log" id="log" cols="80" rows="20">{{getLog}}</textarea>
        </div>
    </div>
</template>

<script>
    export default {
        name: 'app',
        data(){
            return{
                type:'',
                key:'',
                getLog:'',
            }
        },
        mounted(){
            this.key = this.$monitor.init({
                code: 'test',
                url:'http://10.0.10.43:8000/api/beacon'
                //url:'http://localhost:8000/api/beacon'
            }).key;
        },
        beforeUpdate(){
            this.getLog = localStorage.getItem(this.key);
        },
        methods:{
            fun(type){
                this.type = type+Math.random();
                switch (type){
                    case 'err':
                        try{
                            let a = b + 1;
                        }catch(e){
                            this.$monitor.push({
                                title: '回调函数有误：' + e.message,
                                info: e.stack
                            });
                            console.error('回调函数有误：',e.stack)
                        }
                        break;
                    case 'api':
                        let url = 'http://localhost:8000/api';
                        let time = Math.random()*1000 >> 0;
                        this.$monitor.push({
                            title: 'API:'+url.match(/(?:.*\/)*([^?]+)/)[1],
                            url: url,
                            info: time
                        });
                        break;
                    case 'log':
                        this.$monitor.push({
                            title: 'API:手动添加日志',
                            info: '因本条不是API统计，所以title会过滤`API:`字符！'
                        });
                        break;
                    case 'append':
                        let js = document.createElement('script');
                        js.src = 'http://www.baidu.com/js.js';
                        document.body.appendChild(js);
                        break;
                    case 'beacon':
                        this.$monitor.beacon();
                        break;
                    case 'clear':
                        localStorage.removeItem(F.key);
                        break;
                    default:
                }
            }
        }
    }
</script>
