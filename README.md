# 前端监控系统<sup>monitor</sup>

前端监控系统

    监测各系统前端异常错误，旨在及时了解和掌握各系统问题，及时修复。

### 项目fork

本系统后台存储基于[vue-scscms](https://github.com/scscms/vue-scscms)系统。

### 前言

目前一般网站都前后端分离，新框架vue,React等更是如此。但往往网站出现bug或者问题时，我们一下难以判断是前端还是后端的问题。前端同事也一般无法了解整个网站的安全及运行状况，如果此网站对公司极其重要，前端同事有责任要立刻重视起来：必须对此网站重点监护，对重要的api接口调用失败做记录，捕捉系统各种错误，及做好各种前端埋点统计。

### 安装

```
git clone https://github.com/scscms/monitor.git

npm install
```

- mysql数据库

首先安装mysql和新建用户等，教程自行解决。
接着在mysql新建数据库和建表，为了方便操作在此已经提供sql文档：参见`server/mysql.sql`
安装好数据库后，因没注册用户功能，所以需要执行sql语句来添加管理员：

```

INSERT INTO user (user_name,pass_word,user_type,user_email) VALUES ('admin','$2a$10$nPE/kBN4B53bdvWE2ykcNeDtiOFfAMTrv.q1MPiWnxhkO3rQbjSEa',1,'10000@qq.com');

```

执行上面sql语句后可插入用户：`admin`  密码：`admin123` 帐户。

- 配置服务器及端口

然后打开文件`server/config.js`修改数据库和邮箱配置（邮箱暂没使用）。


```
npm run build  #打包
npm run server #服务端运行
npm run start  #开发期，运行前后端
```

至此前端监控后台搭建起来了，等着各系统上报数据...

### 前端上报

参见 [js/README.md](./js/README.md)
