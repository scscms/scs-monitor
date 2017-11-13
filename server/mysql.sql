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
    `title` char(200) NOT NULL DEFAULT '' COMMENT '错误标题',
    `info` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL COMMENT '错误信息',
    `amount` int(10) unsigned NOT NULL DEFAULT '1' COMMENT '数量',
    `url` char(200) NOT NULL DEFAULT '' COMMENT '错误来源页',
    `referrer` char(200) NOT NULL DEFAULT '' COMMENT '来路页面',
    `browser` char(200) NOT NULL DEFAULT '' COMMENT '浏览器信息',
    `ip` char(15) NOT NULL DEFAULT '' COMMENT 'IP地址',
    `occurrence` char(13) NOT NULL DEFAULT '0' COMMENT '发生时间',
    `create_time` timestamp NULL DEFAULT '0000-00-00 00:00:00' COMMENT '上报时间',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='错误日志';

DROP TABLE IF EXISTS `upload`;
CREATE TABLE `upload` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '用户ID',
  `file_name` char(100) NOT NULL DEFAULT '' COMMENT '文件名称',
  `file_path` char(200) NOT NULL DEFAULT '' COMMENT '文件路径',
  `mime_type` char(50) NOT NULL DEFAULT '' COMMENT '文件类型',
  `file_size` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '文件大小KB',
  `is_delete` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否删除',
  `create_time` timestamp NULL DEFAULT '0000-00-00 00:00:00' COMMENT '上传时间',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='上传列表';
