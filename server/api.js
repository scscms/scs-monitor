// 后台路由配置
import config from './config.js'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import jwt from 'jsonwebtoken'
import common from './common'
import nodemailer from 'nodemailer'
import puppeteer from 'puppeteer'

async function sendPipe(ctx) {
  let url = ctx.request.body.url
  let err = '链接地址错误！'
  if (/^https?:\/\/(\w+\.?)+(:\d+)?/i.test(url)) {
    err = await sendPuppeteer(url)
  }
  ctx.body = {
    success: !err,
    message: err,
    data: {}
  }
}
// 自动首屏测试
async function sendPuppeteer(url) {
  const browser = await puppeteer.launch({
    executablePath: './Chromium/chrome.exe', // chrome浏览器地址
    timeout: 15000, // 设置超时时间,
    headless: false,
    ignoreHTTPSErrors: true // 如果是访问https页面 此属性会忽略https错误,
  })
  const page = await browser.newPage()
  const screen = {
    'width': 800,
    'height': 600,
    'deviceScaleFactor': 1,
    'isMobile': false,
    'hasTouch': false,
    'isLandscape': false
  }
  await page.setCacheEnabled(true) // 禁用缓存
  await page.setViewport(screen) // 设置屏幕
  let err = null
  let code
  if (typeof url === 'object') {
    code = url.code
    url = url.domain
  }
  await page.goto(url, { waitUntil: 'load' }).catch(e => {
    err = e.message
  })
  if (err) {
    try {
      await sendEmail(config.emailServer.auth.user, url + '网站异常', `puppeteer检测到此网站异常，错误信息：${err}`)
    } catch (e) {}
  } else {
    // 检查上传目录
    let path = ''
    config.upPath.split('/').forEach(p => {
      if (p && !fs.existsSync(path += p + '/')) {
        fs.mkdirSync(path)
      }
    })
    let str = await page.evaluate(() => {
      let W = window
      let timing = performance.timing
      let entries = []
      performance.getEntries().forEach(function (per) {
        if (per.entryType === 'resource') {
          entries.push({
            'url': per.name,
            'type': per.initiatorType,
            'duration': Math.round(per.duration * 100) / 100
          })
        }
      })
      let obj = {
        uin: 'performance',
        screen_width: W.screen.width,
        screen_height: W.screen.height,
        pixel_ratio: W.devicePixelRatio,
        url: location.pathname,
        type: performance.navigation.type,
        redirect_count: performance.navigation.redirectCount,
        redirect: timing.fetchStart - timing.navigationStart,
        dns_lookup: timing.domainLookupEnd - timing.domainLookupStart,
        tcp_connect: timing.connectEnd - timing.connectStart,
        request: timing.responseStart - timing.requestStart,
        response: timing.responseEnd - timing.responseStart,
        first_paint: timing.domInteractive - timing.fetchStart,
        dom_complete: timing.domComplete - timing.domInteractive,
        dom_ready: timing.domContentLoadedEventEnd - timing.domainLookupStart,
        dom_load: timing.loadEventEnd - timing.domainLookupStart,
        view_time: 10,
        timing: JSON.stringify(timing),
        entries: JSON.stringify(entries)
      }
      return JSON.stringify(obj)
    })
    let json = JSON.parse(str)
    json.code = code
    json.browser = 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36'
    json.browser_type = 'Chrome'
    json.os = 'pc'
    json.referrer = url
    json.ip = config.getCurrentIP()
    await saveReport(Object.keys(json), Object.values(json), 'performance', code, url)
    let file = `${url.match(/.+\/([^:?]+)/)[1]}${Date.now()}.png`
    path = `${config.upPath}${file}`
    await page.screenshot({ path })
    await saveUpFile([1, file, path.replace('dist/', '/'), 'image/png', fs.statSync(path).size, !1, new Date().toLocaleString()])
  }
  await browser.close()
  return err
}
// 公用：发送邮件
async function sendEmail(email, title, body) {
  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport(config.emailServer, {
      from: '<' + config.emailServer.auth.user + '>'
    })
    transporter.sendMail({
      to: email,
      subject: title,
      html: body,
      watchHtml: body
    }, (error, info) => {
      transporter.close()
      error && console.log('发邮件错误：', error.message)
      resolve(error ? error.message : '')
    })
  })
}
// 从数据库读取上报项目
async function privateGetProject() {
  const connection = await mysql.createConnection(config.mysqlDB)
  const [list] = await connection.execute(`select * from project order by sort`, [])
  await connection.end()
  common.project_list = list
}
// 项目列表
async function project(ctx) {
  let code = ctx.request.body.code
  let data = common.project_list
  let where = ''
  let arr = []
  if (data.find(o => o.code === code)) {
    where = 'where code=?'
    data = data.filter(o => o.code === code)
    arr = [code]
  }
  const connection = await mysql.createConnection(config.mysqlDB)
  const [reports] = await connection.execute(`select code,count(id)as counts,left(title,7) as t from reports ${where} GROUP BY t`, arr)
  const [performance] = await connection.execute(`select browser_type,count(id)as counts from performance ${where} GROUP BY browser_type`, arr)
  const [statistics] = await connection.execute(`select p.code,r.rc,f.fc from project p left join (select code,count(id) as rc from reports ${where} GROUP BY code) r on r.code = p.code left join (select code,convert(avg(dom_load),decimal(10,2)) as fc from performance ${where} GROUP BY code) f on f.code = p.code`, arr.concat(arr))
  await connection.end()
  ctx.body = {
    success: true,
    data: {
      statistics,
      reports,
      performance,
      data
    }
  }
}
// 更新项目（保存、修改和删除）
async function updateProject(ctx) {
  let data = ctx.request.body
  let msg
  let id = data.id >> 0
  const connection = await mysql.createConnection(config.mysqlDB)
  if (data.del && id) {
    const [result] = await connection.execute(`DELETE from project where id=?`, [id])
    msg = result.affectedRows > 0 ? '' : '删除项目失败！'
  } else {
    let msg
    let arr = []
    const obj = {
      code: '编码',
      sort: '排序',
      name: '项目名称',
      domain: '域名',
      log_odds: '日志采集机率',
      performance_odds: '性能采集机率',
      comment: '说明'
    }
    const array = Object.getOwnPropertyNames(obj)
    array.forEach(key => {
      if (data[key] === '' && key !== 'comment' && !msg) {
        msg = obj[key] + '不能为空！'
      }
      arr.push(data[key])
    })
    if (!msg) {
      if (id) {
        array.splice(0, 1)// 修改时不能编码
        arr.splice(0, 1)
        arr.push(id)
        const [result] = await connection.execute(`UPDATE project SET ${array.map(k => k + '=?').join(',')} where id=?`, arr)
        msg = result.affectedRows === 1 ? '' : '修改项目失败'
      } else {
        const [result] = await connection.execute(`INSERT INTO project (${array.join(',')}) VALUES (${array.map(() => '?').join(',')})`, arr)
        msg = result.affectedRows === 1 ? '' : '添加项目失败'
      }
    }
  }
  await connection.end()
  if (!msg) {
    await privateGetProject()
  }
  ctx.body = {
    success: !msg,
    message: msg,
    data: {}
  }
}
// 监控数据列表
async function listReport(ctx) {
  const data = ctx.request.body
  const table = data.table === 'performance' ? 'performance' : 'reports'
  let pageSize = Math.abs(data.pageSize >> 0) || 10// 分页率
  let page = Math.abs(data.page >> 0) || 1// 当前页码
  let begin = data.begin
  let end = data.end
  const arr = []
  let querying = ''
  if (data.title) {
    querying += ' and title like ?'
    arr.push('%' + data.title + '%')
  }
  if (data.url) {
    querying += ' and url = ?'
    arr.push(data.url)
  }
  if (data.sort_id) {
    querying += ' and code = ?'
    arr.push(data.sort_id)
  }
  let reg = /^\d{4}-\d{1,2}-\d{1,2}$/
  if (reg.test(begin) && reg.test(end)) {
    if (begin === end) {
      querying += ' and to_days(occurrence) = to_days(?)'
      arr.push(begin)
    } else {
      querying += ' and occurrence BETWEEN ? AND ?'
      arr.push(begin, end)
    }
  }
  querying = querying.replace('and', 'where')
  const connection = await mysql.createConnection(config.mysqlDB)
  const [rows] = await connection.execute(`SELECT SQL_NO_CACHE COUNT(*) as total FROM ${table} ${querying}`, arr)
  const total = rows[0].total// 总数量
  const pages = Math.ceil(total / pageSize)
  if (page > pages) {
    page = Math.max(1, pages)// 以防没数据
  }
  querying += ' ORDER BY id DESC LIMIT ?, ?'
  arr.push((page - 1) * pageSize, pageSize)
  const [list] = await connection.execute(`SELECT * FROM ${table} ${querying}`, arr)
  await connection.end()
  ctx.body = {
    success: true,
    message: '',
    data: {
      page, total, data: list
    }
  }
}
// 共用保存上报信息
async function saveReport(column, value, values, code, referer) {
  // 连接数据库前先判断是否合法及抽样
  let row = 0
  let obj = common.project_list.find(arr => arr.code === code)
  let odds = values === 'performance' ? 'performance_odds' : 'log_odds'
  if (obj && referer.includes(obj.domain) && obj[odds] > Math.random()) {
    const connection = await mysql.createConnection(config.mysqlDB)
    if (values === 'performance') {
      const [result] = await connection.execute(`INSERT INTO performance (${column.join(',')}) VALUES (${column.map(() => '?').join(',')})`, value)
      row = result.affectedRows
    } else if (Array.isArray(values)) {
      const [result] = await connection.execute(`INSERT INTO reports (${column.join(',')}) VALUES ${value.join(',')}`, values)
      row = result.affectedRows
    }
    await connection.end()
  }
  return row
}
// 管理员删除上报信息\性能信息
async function deleteReport(ctx) {
  const data = ctx.request.body
  const table = data.table === 'performance' ? 'performance' : 'reports'
  let ids = data.ids
  let msg
  if (/^\d+(,\d+)*$/.test(ids)) {
    const arr = ids.split(',')
    const connection = await mysql.createConnection(config.mysqlDB)
    const [result] = await connection.execute(`DELETE from ${table} where id in (${arr.map(() => '?').join(',')})`, arr)
    msg = result.affectedRows > 0 ? '' : '删除上报失败！'
    await connection.end()
  } else {
    msg = 'ID参数不合法'
  }
  ctx.body = {
    success: !msg,
    message: msg,
    data: {}
  }
}

// 用户列表
async function listUser(ctx) {
  let data = ctx.request.body
  const arr = []
  let querying = ''
  if (data.user_name) {
    querying += ' and user_name like ?'
    arr.push('%' + data.user_name + '%')
  }
  if (data.user_email) {
    querying += ' and user_email like ?'
    arr.push('%' + data.user_email + '%')
  }
  if (/^[1-3]$/.test(data.user_type)) {
    querying += ' and user_type=?'
    arr.push(data.user_type >> 0)
  }
  const connection = await mysql.createConnection(config.mysqlDB)
  const [list] = await connection.execute('SELECT * FROM `user`' + querying.replace('and', 'where'), arr)
  await connection.end()
  list.forEach(obj => {
    obj.user_email = '****' + obj.user_email.slice(4)// 过滤邮箱地址
    obj.user_pass = ''
  })
  ctx.body = {
    success: true,
    data: { data: list }
  }
}
// 审核用户
async function passedUser(ctx) {
  let data = ctx.request.body
  let ids = data.ids
  let msg
  if (/^\d+(,\d+)*$/.test(ids)) {
    const arr = ids.split(',')
    ids = new Array(arr.length).fill('?').join(',')
    const connection = await mysql.createConnection(config.mysqlDB)
    const [result] = await connection.execute(`UPDATE user SET user_type=4 where user_type=0 and id in (${ids})`, arr)
    msg = result.affectedRows > 0 ? '' : '审核用户失败！'
    await connection.end()
  } else {
    msg = 'ID参数不合法'
  }
  ctx.body = {
    success: !msg,
    message: msg,
    data: { passed: 4 }
  }
}
// 删除用户（禁止删除管理员）
async function deleteUser(ctx) {
  const data = ctx.request.body
  let ids = data.ids
  let msg
  if (/^\d+(,\d+)*$/.test(ids)) {
    const arr = ids.split(',')
    const connection = await mysql.createConnection(config.mysqlDB)
    const [result] = await connection.execute(`DELETE from user where user_type<>1 and user_type<>2 and id in (${arr.map(() => '?').join(',')})`, arr)
    msg = result.affectedRows > 0 ? '' : '删除用户失败！'
    await connection.end()
  } else {
    msg = 'ID参数不合法'
  }
  ctx.body = {
    success: !msg,
    message: msg,
    data: {}
  }
}
// 用户上传头像
async function upUserPic(ctx) {
  let pic = ctx.request.body.pic
  let msg = common.pic_reg.test(pic) ? null : common.pic_txt
  if (!msg) {
    const connection = await mysql.createConnection(config.mysqlDB)
    const [result] = await connection.execute('UPDATE user SET user_pic=? where id=?', [pic, ctx.state.userInfo.id >> 0])
    msg = result.affectedRows === 1 ? '' : '更新头像失败'
    await connection.end()
  }
  ctx.body = {
    success: !msg,
    message: msg,
    data: { pic }
  }
}
// 保存用户
async function updateUser(ctx) {
  let data = ctx.request.body
  data.user_type = data.user_type >> 0
  data.user_type = data.user_type === 1 ? 4 : data.user_type
  let msg
  let arr = []
  const obj = {
    user_name: '用户帐号',
    user_email: '用户邮箱',
    pass_word: '用户密码',
    user_type: '用户类型',
    user_pic: '用户头像'
  }
  const array = Object.getOwnPropertyNames(obj)
  array.forEach(key => {
    if (data[key] === '' && key !== 'user_pic' && !msg) {
      msg = obj[key] + '不能为空！'
    }
    arr.push(data[key])
  })
  if (!common.name_reg.test(data.user_name)) {
    msg = common.name_txt
  } else if (!common.pass_reg.test(data.pass_word)) {
    msg = common.pass_txt
  } else if (!common.email_reg.test(data.user_email)) {
    msg = common.email_txt
  }
  if (!msg) {
    let id = data.id >> 0
    const connection = await mysql.createConnection(config.mysqlDB)
    if (id) {
      array.splice(0, 2)// 修改时不能修改帐号和邮箱
      arr.splice(0, 2)
      if (data.pass_word === common.defaultPassword) {
        array.shift()// 不修改原密码
        arr.shift()
      }
      arr.push(id)
      const [result] = await connection.execute(`UPDATE user SET ${array.map(k => k + '=?').join(',')} where id=?`, arr)
      msg = result.affectedRows === 1 ? '' : '修改用户失败'
    } else {
      array.push('create_time')
      arr.push(new Date().toLocaleString())
      arr[2] = bcrypt.hashSync(data.pass_word, bcrypt.genSaltSync(10))// 加密密码
      // 先检查是否占用帐号
      const [rows] = await connection.execute('SELECT user_name,user_email FROM `user` where `user_name`=? or `user_email`=?', [data.user_name, data.user_email])
      if (rows.length > 0) {
        msg = rows[0].user_name === data.user_name ? '帐号已经被占用！' : '邮箱已经被占用！'
      } else {
        const [result] = await connection.execute(`INSERT INTO user (${array.join(',')}) VALUES (${array.map(() => '?').join(',')})`, arr)
        msg = result.affectedRows === 1 ? '' : '添加用户失败'
      }
    }
    await connection.end()
  }
  ctx.body = {
    success: !msg,
    message: msg,
    data: {}
  }
}
// 获取用户信息
async function getUserById(ctx) {
  let id = ctx.request.body.id >> 0
  const connection = await mysql.createConnection(config.mysqlDB)
  const [list] = await connection.execute('SELECT * FROM user where id=?', [id])
  const success = list.length === 1
  await connection.end()
  ctx.body = {
    success,
    message: success ? '' : '查无此用户',
    data: success ? list[0] : {}
  }
}
// 用户登录
async function login(ctx) {
  const data = ctx.request.body
  let msg
  if (!common.name_reg.test(data.user_name)) {
    msg = common.name_txt
  } else if (!common.pass_reg.test(data.pass_word)) {
    msg = common.pass_txt
  } else {
    // 初步验证通过，开始查询数据库
    const connection = await mysql.createConnection(config.mysqlDB)
    const [rows] = await connection.execute('SELECT * FROM `user` where `user_name`=?', [data.user_name])
    msg = '用户名或密码错误！'// 不应该具体透露是密码还是帐户出错！
    if (rows.length) {
      const userInfo = rows[0]
      if (bcrypt.compareSync(data.pass_word, userInfo.pass_word)) {
        if (userInfo.user_type === 0) {
          msg = '此帐号正在审核中！'
        } else {
          const ip = config.getClientIP(ctx)
          await connection.execute('UPDATE `user` SET `login_ip`=? where `id`=?', [ip, userInfo.id])
          delete userInfo.pass_word
          ctx.body = {
            success: true,
            data: {
              userInfo,
              token: jwt.sign(Object.assign({ ip }, userInfo),
                config.JWTs.secret, { expiresIn: config.JWTs.expiresIn })
            }
          }
          return
        }
      }
    }
    await connection.end()
  }
  ctx.body = {
    success: false,
    message: msg,
    data: {}
  }
}

// 修改密码
async function changePassword(ctx) {
  const data = ctx.request.body
  let err
  const obj = {
    old_password: '旧密码',
    pass_word: '新密码',
    pass_words: '确认密码'
  }
  for (let key in obj) {
    if (!common.pass_reg.test(data[key])) {
      err = obj[key] + '格式不正确！'
      break
    }
  }
  if (!err && data.old_password === data.pass_words) {
    err = '旧密码不能与新密码相同！'
  } else if (!err && data.pass_word !== data.pass_words) {
    err = '新密码与确认密码不相同！'
  }
  if (!err) {
    const user = ctx.state.userInfo// 获取用户信息
    const connection = await mysql.createConnection(config.mysqlDB)
    const [rows] = await connection.execute('SELECT `pass_word` FROM `user` where `id`=?', [user.id])
    if (rows.length && bcrypt.compareSync(data.old_password, rows[0].pass_word)) {
      const password = bcrypt.hashSync(data.pass_word, bcrypt.genSaltSync(10))// 加密新密码
      const result = await connection.execute('update `user` set `pass_word`=? where `id`=?', [password, user.id])
      err = result.affectedRows === 0 ? '修改密码失败！' : ''
    } else {
      err = '旧密码不正确！'
    }
    await connection.end()
  }
  ctx.body = {
    success: !err,
    message: err,
    data: {}
  }
}

// 保存上传记录
async function saveUpFile(arr) {
  const connection = await mysql.createConnection(config.mysqlDB)
  const [result] = await connection.execute('INSERT INTO `upload` (user_id,file_name,file_path,mime_type,file_size,is_delete,create_time) VALUES (?,?,?,?,?,?,?)', arr)
  await connection.end()
  return result
}
// 上传文件列表
async function listUpFile(ctx) {
  const data = ctx.request.body
  let pageSize = Math.abs(data.pageSize >> 0) || 10
  let page = Math.abs(data.page >> 0) || 1// 当前页码
  const connection = await mysql.createConnection(config.mysqlDB)
  const [rows] = await connection.execute('SELECT SQL_NO_CACHE COUNT(*) as total FROM `upload` order by id', [])
  const total = rows[0].total// 总数量
  const pages = Math.ceil(total / pageSize)
  if (page > pages) {
    page = Math.max(1, pages)// 以防没数据
  }
  const [list] = await connection.execute('SELECT a.*,u.`user_name` FROM upload as a LEFT JOIN user as u on a.user_id = u.id LIMIT ?, ?', [(page - 1) * pageSize, pageSize])
  await connection.end()
  list.forEach(obj => {
    obj.full_path = common.web_domain + obj.file_path.replace(/\\/g, '/').replace('dist/', '/')
  })
  ctx.body = {
    success: true,
    message: '',
    data: {
      page, total, data: list
    }
  }
}
// 删除上传文件列表
async function delFile(ctx) {
  const data = ctx.request.body
  let ids = data.id
  let arr = ids.split(',')
  let msg
  if (/^\d+(,\d+)*$/.test(ids)) {
    ids = arr.map(() => '?').join(',')
    const connection = await mysql.createConnection(config.mysqlDB)
    const [rows] = await connection.execute(`SELECT file_path FROM upload where id in (${ids})`, arr)
    if (rows.length) {
      for (let i = rows.length; i--;) {
        const path = rows[i].file_path.replace(/\\/g, '/')
        if (path.startsWith(config.upPath)) {
          try {
            fs.unlinkSync(path)
          } catch (e) {}
        }
      }
      if (data.delRecord === 'true') {
        await connection.execute(`DELETE from upload where id in (${ids})`, arr)
      }
    } else {
      msg = '无此记录'
    }
    await connection.end()
  } else {
    msg = 'ID参数不合法'
  }
  ctx.body = {
    success: !msg,
    message: msg,
    data: {}
  }
}
privateGetProject()// 默认获取一次

export default {
  sendPipe,
  listReport,
  sendPuppeteer,
  deleteReport,
  project,
  updateProject,
  saveReport,
  listUser,
  saveUpFile,
  listUpFile,
  delFile,
  login,
  changePassword,
  passedUser,
  deleteUser,
  getUserById,
  upUserPic,
  updateUser
}
