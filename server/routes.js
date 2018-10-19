// 后台路由配置
import jwt from 'jsonwebtoken'
import config from './config.js'
import api from './api'
import common from './common'
import koaRouter from 'koa-router'
import multer from 'koa-multer'
import fs from 'fs'
import koaBody from 'koa-body'
import schedule from 'node-schedule'

const routes = koaRouter()
// userType:需要的用户权限  0:游客 1:超级管理员 2:普通管理员 3:VIP用户 4:普通用户
const urls = {
  'listReport': {},
  'deleteReport': {}, // 删除上报信息
  'performance': { userType: 0 }, // 上报性能信息
  'sendPipe': { userType: 4 }, // 测试
  'project': { userType: 4 }, // 项目列表
  'updateProject': { userType: common.page_grade.project }, // 更新项目
  'beacon': { userType: 0 }, // 上报信息
  'login': { userType: 0 }, // 用户登录（游客）
  'changePassword': {},
  'upFile': {},
  'listUpFile': {},
  'delFile': {},
  'listUser': {},
  'updateUser': {},
  'getUserById': { userType: common.page_grade.updateUser },
  'passedUser': {},
  'deleteUser': {},
  'upUserPic': { userType: 4 }// 用户上传头像
}

const exclude = ['upFile', 'beacon', 'performance'] // 排除接口
Object.getOwnPropertyNames(urls).forEach(key => {
  if (common.page_grade.hasOwnProperty(key)) {
    urls[key].userType = common.page_grade[key]// 覆盖访问权限
  }
  if (!exclude.includes(key)) {
    let obj = urls[key]
    let url = '/' + key + (obj.url || '')
    routes[obj.method ? obj.method : 'post'](url, api[key])
  }
})

// 文件上传配置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let path = ''
    config.upPath.split('/').forEach(p => {
      if (p && !fs.existsSync(path += p + '/')) {
        fs.mkdirSync(path)
      }
    })
    cb(null, config.upPath)
  },
  filename: function (req, file, cb) {
    let path = Date.now() + file.originalname.match(/\.\w+$/)[0]
    cb(null, path)
  }
})

// 上报信息navigator.sendBeacon
routes.post('/beacon', koaBody(), async (ctx) => {
  const json = JSON.parse(ctx.request.body)
  const browser = ctx.request.header['user-agent'] || ''// 浏览器信息
  const referrer = ctx.request.header.referer || ''// 来源页
  const ip = config.getClientIP(ctx)
  const arr = ['code', 'uin', 'browser', 'ip', 'title', 'info', 'amount', 'url', 'referrer', 'occurrence']
  const _v = '(' + arr.map(() => '?').toString() + ')'
  const value = []
  const values = []
  json.list.forEach(d => {
    values.push(json.code)
    values.push(json.uin.substring(0, 20))
    values.push(browser)
    values.push(ip)
    values.push(d.title.substring(0, 200))
    values.push(d.info)
    values.push(d.amount | 0)// 确定为数字
    values.push(d.url.substring(0, 200))
    values.push(referrer.substring(0, 200))
    values.push(d.occurrence)// 错误发生的时间戳
    value.push(_v)
  })
  ctx.body = await api.saveReport(arr, value, values, json.code, ctx.request.header.referer) > 0 ? 'ok' : 'no'
})

// 上报性能信息
routes.post('/performance', koaBody(), async (ctx) => {
  const json = JSON.parse(ctx.request.body)
  const browser = ctx.request.header['user-agent'] || ''
  const referrer = ctx.request.header.referer || ''// 来源页
  const ip = config.getClientIP(ctx)
  const Agents = ['Android', 'iPhone', 'SymbianOS', 'Windows Phone', 'iPad', 'iPod']
  let os = 'pc'
  for (let i = Agents.length; i--;) {
    if (browser.includes(Agents[i])) {
      os = Agents[i]
      break
    }
  }
  // 获取浏览器
  let bt = 'other'
  const browserArr = ['compatible; MSIE', 'rv:11', 'Edge', 'Safari', 'Firefox', 'Opera', 'Chrome', 'QQ', 'MicroMessenger']
  for (let i = browserArr.length; i--;) {
    if (browser.includes(browserArr[i])) {
      bt = browserArr[i]
      break
    }
  }
  if (bt === 'MicroMessenger') {
    bt = 'WeChat'
  } else if (bt === 'rv:11') {
    bt = 'IE11'
  } else if (bt === 'compatible; MSIE') {
    bt = 'IE' + /MSIE (\d+)/.exec(browser)[1]
  }
  if (bt === 'other') {
    let reg = /\w+spider/.exec(browser)
    reg && (bt = reg[0]) // 搜索引擎
  }
  const arr = ['code', 'uin', 'screen_width', 'screen_height', 'pixel_ratio', 'url', 'type', 'redirect_count', 'redirect', 'dns_lookup', 'tcp_connect', 'request', 'response', 'first_paint', 'dom_complete', 'dom_ready', 'dom_load', 'view_time', 'timing', 'entries']
  const values = []
  let _arr = arr.slice(13, 18)
  arr.forEach(k => {
    let _t = json[k] || 0
    if (_arr.includes(k)) {
      _t = _t > 1e9 ? 1e9 : _t < 0 ? 0 : _t
    }
    values.push(_t)
  })
  arr.push('browser'); values.push(browser)
  arr.push('browser_type'); values.push(bt)
  arr.push('os'); values.push(os)
  arr.push('referrer'); values.push(referrer)
  arr.push('ip'); values.push(ip)
  ctx.body = await api.saveReport(arr, values, 'performance', json.code, ctx.request.header.referer) > 0 ? 'ok' : 'no'
})
// 上传文件
routes.post('/upFile', multer({ storage }).single('file'), async (ctx) => {
  const { originalname, mimetype, filename, path, size } = ctx.req.file
  let msg
  let isDel = 0
  if (size > common.upFile_maxSize || !common.upFile_accept.test(mimetype)) {
    msg = size > common.upFile_maxSize ? '上传文件大小超出' : '非法上传文件格式'
    isDel = 1
    fs.unlinkSync(path)// 同步删除文件
  }
  await api.saveUpFile([ctx.state.userInfo.id, originalname, path, mimetype, size, isDel, new Date().toLocaleString()])
  ctx.body = {
    success: !msg,
    message: msg,
    data: {
      filename: config.upPath.replace('dist/', '/') + filename
    }
  }
})

// 验证权限函数
async function verify(ctx) {
  return new Promise((resolve, reject) => {
    if (ctx.url.substring(0, 5) !== '/api/') {
      resolve({})// 非后端接口请求
    }
    let arr = /\/api\/([a-zA-Z]+)/.exec(ctx.url)
    let key = arr ? arr[1] : ''
    let obj = urls[key]
    if (!urls.hasOwnProperty(key)) {
      resolve('非法请求链接：' + ctx.url)
    } else if (ctx.method !== (obj.method ? obj.method : 'post').toUpperCase()) {
      resolve('非法请求方式：' + ctx.method)
    }
    // 异步验证token
    const userType = obj.userType
    if (userType === 0) {
      resolve({}) // 不需要验证token
    }
    jwt.verify(ctx.request.header.authorization, config.JWTs.secret, (err, decoded) => {
      if (err) {
        resolve('token验证错误！')
      } else {
        if (config.getClientIP(ctx) !== decoded.ip || !Number.isInteger(decoded.id)) {
          resolve('token无效！')
        } else if (decoded.user_type > userType) {
          resolve('对不起您无权操作！')
        }
      }
      resolve(decoded)// 把用户信息带上
    })
  })
}

// 定时器 自动首屏测试
schedule.scheduleJob({ hour: 11, minute: 57, second: 23 }, async() => {
  let arr = common.project_list
  for (let i = arr.length; i--;) {
    await api.sendPuppeteer(arr[i])
  }
})

export default {
  verify,
  routes
}
