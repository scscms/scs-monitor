#mysql数据库表结构

DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_name` char(50) NOT NULL DEFAULT '' COMMENT '用户帐号',
  `pass_word` char(128) NOT NULL DEFAULT '' COMMENT '用户密码',
  `user_type` tinyint(1) unsigned NOT NULL DEFAULT '0' COMMENT '用户类型 0:未审核用户;1:管理员;2:普通用户',
  `user_email` char(128) NOT NULL DEFAULT '' COMMENT '邮箱地址',
  `create_time` timestamp DEFAULT '0000-00-00 00:00:00' COMMENT '注册时间',
  `login_ip` char(15) NOT NULL DEFAULT '' COMMENT '登录IP',
  `update_time` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP COMMENT '最后登录时间',
  `user_pic` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '' COMMENT '用户头像',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='用户据库表';

DROP TABLE IF EXISTS `reports`;
CREATE TABLE `reports` (
    `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
    `code` char(10) NOT NULL DEFAULT '' COMMENT '项目编码',
    `uin` char(20) NOT NULL DEFAULT '' COMMENT '用户',
    `title` varchar(50) NOT NULL DEFAULT '' COMMENT '错误标题',
    `info` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL COMMENT '错误信息',
    `amount` int(10) unsigned NOT NULL DEFAULT '1' COMMENT '数量',
    `url` char(200) NOT NULL DEFAULT '' COMMENT '错误来源页',
    `referrer` char(200) NOT NULL DEFAULT '' COMMENT '来路页面',
    `browser` char(200) NOT NULL DEFAULT '' COMMENT '浏览器信息',
    `ip` char(15) NOT NULL DEFAULT '' COMMENT 'IP地址',
    `occurrence` char(13) NOT NULL DEFAULT '0' COMMENT '发生时间',
    `create_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '上报时间',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='错误日志';

DROP TABLE IF EXISTS `project`;
CREATE TABLE `project` (
    `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
    `sort` int(2) unsigned NOT NULL DEFAULT '0' COMMENT '排序ID',
    `code` char(10) NOT NULL UNIQUE COMMENT '项目编码',
    `name` char(20) NOT NULL DEFAULT '' COMMENT '项目名称',
    `domain` char(200) NOT NULL DEFAULT '' COMMENT '域名',
    `log_odds` decimal(1,1) unsigned COMMENT '日志采集机率',
    `performance_odds` decimal(1,1) unsigned COMMENT '性能采集机率',
    `comment` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL COMMENT '说明',
    `create_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '添加时间',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='项目列表';

DROP TABLE IF EXISTS `performance`;
CREATE TABLE `performance` (
    `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
    `code` char(10) NOT NULL DEFAULT '' COMMENT '项目编码',
    `uin` char(20) NOT NULL DEFAULT '' COMMENT '用户',
    `ip` char(15) NOT NULL DEFAULT '' COMMENT 'IP地址',
    `os` char(20) NOT NULL DEFAULT '' COMMENT '操作系统',
    `screen_width` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '屏幕宽度',
    `screen_height` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '屏幕高度',
    `pixel_ratio` decimal(10,2) unsigned NOT NULL DEFAULT '0' COMMENT '设备像素比',
    `url` char(200) NOT NULL DEFAULT '' COMMENT '当前页',
    `referrer` char(200) NOT NULL DEFAULT '' COMMENT '来源页面',
    `type` char(200) NOT NULL DEFAULT '' COMMENT '来源方式',
    `redirect_count` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '重定向次数',
    `browser` varchar(200) NOT NULL DEFAULT '' COMMENT '浏览器信息',
    `browser_type` varchar(20) NOT NULL DEFAULT '' COMMENT '浏览器种类',
    `redirect` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '重定向耗时',
    `dns_lookup` int(10) unsigned NOT NULL DEFAULT '0' COMMENT 'DNS 查询耗时',
    `tcp_connect` int(10) unsigned NOT NULL DEFAULT '0' COMMENT 'TCP连接耗时',
    `request` int(10) unsigned NOT NULL DEFAULT '0' COMMENT 'request请求耗时',
    `response` int(10) unsigned NOT NULL DEFAULT '0' COMMENT 'response响应耗时',
    `first_paint` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '白屏时间',
    `dom_complete` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '解释dom树耗时',
    `dom_ready` int(10) unsigned NOT NULL DEFAULT '0' COMMENT 'domReady文档就绪',
    `dom_load` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '文档加载总耗时',
    `view_time` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '用户停留时间',
    `timing` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL COMMENT 'timing详情',
    `entries` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL COMMENT '资源加载情况',
    `occurrence` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '上报时间',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='性能日志';

DROP TABLE IF EXISTS `upload`;
CREATE TABLE `upload` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '用户ID',
  `file_name` char(100) NOT NULL DEFAULT '' COMMENT '文件名称',
  `file_path` char(200) NOT NULL DEFAULT '' COMMENT '文件路径',
  `mime_type` char(50) NOT NULL DEFAULT '' COMMENT '文件类型',
  `file_size` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '文件大小KB',
  `is_delete` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否删除',
  `create_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='上传列表';

INSERT INTO user (user_name,pass_word,user_type,user_email) VALUES ('admin','$2a$10$oe/ovruYdv0EmNsKWLJwfu6Na51whOBRJOAJxBO.yt/C6DxQhdDNK',1,'10000@qq.com');
#可选的操作：插入用户：admin  密码：admin123
