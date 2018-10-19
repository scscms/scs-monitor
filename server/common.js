// 前、后台共用变量
export default {
  web_name: '前端监控系统',
  web_domain: 'http://localhost:8000', // 访问域名
  name_reg: /^[a-z\u4e00-\u9fa5]{3,10}$/i, // 帐号验证
  name_txt: '3至10个英文或中文字符', // 帐号规则
  pass_reg: /^(?=.*[a-z])(?=.*\d)[a-z\d]{6,12}$/i, // 密码验证
  defaultPassword: '88888888888a', // 默认密码：当修改用户信息时不更改密码的标识
  pass_txt: '6至12个英文和数字组成的字符', // 密码规则
  email_reg: /^[a-z\d]+([-_.][a-z\d]+)*@([a-z\d]+[-.])+[a-z]{2,3}$/, // 邮箱正则表达式
  email_txt: '请输入正确邮箱地址',
  pic_reg: /^(https?:\/\/|\/upFile\/)/i,
  pic_txt: '头像地址不正确！',
  upFile_maxSize: 1024 * 1024 * 5, // 上传文件大小限制
  upFile_accept: /^image\//, // 上传文件格式限制
  user_type: {
    0: '未审核用户',
    1: '超级管理员',
    2: '普通管理员',
    3: '普通用户'
  },
  // 页面权限设置 0:所有人 3:所有登录用户 2:管理员级别 1:只有超级管理员
  page_grade: {
    listReport: 3, // 上报信息列表（必须登录）
    project: 1, // 监控项目，管理员
    deleteReport: 2, // 删除上报信息（管理员级别）
    changePassword: 3, // 修改密码（必须登录）
    delFile: 3, // 批量或单个删除上传文件列表（管理员级别）
    upFile: 3, // 上传权限(共用)
    listUpFile: 3, // 管理上传列表
    listUser: 3, // 用户列表
    updateUser: 1, // 添加、修改用户（超级管理员）
    passedUser: 3, // 审核用户列表
    deleteUser: 1// 删除用户列表
  },
  project_list: [], // 项目列表(后端使用)
  page_sizes: [10, 20, 50, 100, 150, 200]
}
