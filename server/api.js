//后台路由配置
import config from './config.js'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import fs from "fs"
import jwt from 'jsonwebtoken'
import common from './common'
import nodemailer from 'nodemailer'

//公用：发送邮件
function sendEmail(email, title, body) {
    return new Promise((resolve, reject) => {
        const transporter = nodemailer.createTransport(config.emailServer, {
            from: '<' + config.emailServer.auth.user + '>',
        });
        transporter.sendMail({
            to: email,
            subject: title,
            html: body,
            watchHtml: body,
        }, (error, info) => {
            transporter.close();
            resolve(error ? error.message : '');
        });
    })
}
//监控数据列表
async function listReport(ctx) {
    const data = ctx.request.body;
    let pageSize = Math.abs(data.pageSize >> 0)||10;//分页率
    let page = Math.abs(data.page >> 0)||1;//当前页码
    let begin = data.begin;
    let end = data.end;
    const arr = [];
    let querying = '';
    if(data.title){
        querying += " and title like ?";
        arr.push('%' + data.title + '%');
    }
    if(data.sort_id){
        querying += ' and code = ?';
        arr.push(data.sort_id);
    }
    if(begin>0 && end>0){
        if(begin === end){
            querying += " and to_days(create_time) = to_days(?)";
            arr.push(begin);
        }else{
            querying += " and create_time BETWEEN ? AND ?";
            arr.push(begin,end);
        }
    }
    querying = querying.replace('and','where');
    const connection = await mysql.createConnection(config.mysqlDB);
    const [rows] = await connection.execute(`SELECT SQL_NO_CACHE COUNT(*) as total FROM reports ${querying}`, arr);
    const total = rows[0].total;//总数量
    const pages = Math.ceil(total/pageSize);
    if(page > pages){
        page = Math.max(1,pages);//以防没数据
    }
    querying += " ORDER BY id DESC LIMIT ?, ?";
    arr.push((page - 1) * pageSize,pageSize);
    const [list] = await connection.execute(`SELECT * FROM reports ${querying}`, arr);
    await connection.end();
    list.forEach(obj=>{
        obj.create_time = obj.create_time.toLocaleString();
    });
    ctx.body = {
        success: true,
        message: '',
        data: {
            page,total,data:list
        }
    }
}

//保存上报信息
async function saveReport(column,value,values) {
    let row = 0;
    if(values.length){
        const connection = await mysql.createConnection(config.mysqlDB);
        const [result] = await connection.execute(`INSERT INTO reports (${column.join(",")}) VALUES ${value.join(',')}`, values);
        await connection.end();
        row = result.affectedRows;
    }
    return row;
}
//上报信息
async function report(ctx) {
    const data = ctx.request.body;
    const browser = ctx.request.header['user-agent']||'';
    const referrer = ctx.request.header.referer||'';//来源页
    const ip = config.getClientIP(ctx);
    const arr = ['code','uin','browser','ip','title','info','amount','url','referrer','occurrence','create_time'];
    const _v = '(' + arr.map(() => '?').toString() + ')';
    const value = [];
    const values = [];
    if(typeof data.title !== 'object'){
        data.title = [data.title];
        data.info = [data.info];
        data.amount = [data.amount];
        data.url = [data.url];
        data.occurrence = [data.occurrence];
    }
    for(let i = data.title.length;i--;){
        values.push(data.code);
        values.push(data.uin);
        values.push(browser);
        values.push(ip);
        values.push(data.title[i]);
        values.push(data.info[i]);
        values.push(data.amount[i] >> 0);//确定为数字
        values.push(data.url[i]);
        values.push(referrer);
        values.push(data.occurrence[i]||0);//错误发生的时间戳
        values.push(new Date().toLocaleString());
        value.push(_v);
    }
    ctx.body = await saveReport(arr,value,values) > 0 ? 'ok' : 'no';
}
//管理员删除上报信息
async function deleteReport(ctx){
    const data = ctx.request.body;
    let ids = data.ids;
    let msg;
    if(/^\d+(,\d+)*$/.test(ids)){
        const arr = ids.split(',');
        const connection = await mysql.createConnection(config.mysqlDB);
        const [result] = await connection.execute(`DELETE from reports where id in (${arr.map(() => '?').join(',')})`, arr);
        msg = result.affectedRows > 0 ? '':'删除上报失败！';
        await connection.end();
    }else{
        msg = 'ID参数不合法';
    }
    ctx.body = {
        success: !msg,
        message: msg,
        data: {}
    }
}

//用户列表
async function listUser(ctx) {
    let data = ctx.request.body;
    const arr = [];
    let querying = '';
    if(data.user_name){
        querying += " and user_name like ?";
        arr.push('%' + data.user_name + '%');
    }
    if(data.user_email){
        querying += " and user_email like ?";
        arr.push('%' + data.user_email + '%');
    }
    if(/^[1-3]$/.test(data.user_type)){
        querying += " and user_type=?";
        arr.push(data.user_type >> 0);
    }
    const connection = await mysql.createConnection(config.mysqlDB);
    const [list] = await connection.execute("SELECT * FROM `user`"+querying.replace('and','where'), arr);
    await connection.end();
    list.forEach(obj=>{
        obj.user_email = '****'+obj.user_email.slice(4);//过滤邮箱地址
        obj.user_pass = '';
    });
    ctx.body = {
        success: true,
        data:{data:list}
    };
}
//审核用户
async function passedUser(ctx){
    let data = ctx.request.body;
    let ids = data.ids;
    let msg;
    if(/^\d+(,\d+)*$/.test(ids)){
        const arr = ids.split(',');
        ids = new Array(arr.length).fill("?").join(',');
        const connection = await mysql.createConnection(config.mysqlDB);
        const [result] = await connection.execute(`UPDATE user SET user_type=4 where user_type=0 and id in (${ids})`, arr);
        msg = result.affectedRows > 0 ? '':'审核用户失败！';
        await connection.end();
    }else{
        msg = 'ID参数不合法';
    }
    ctx.body = {
        success: !msg,
        message: msg,
        data: {passed:4}
    }
}
//删除用户（禁止删除管理员）
async function deleteUser(ctx){
    const data = ctx.request.body;
    let ids = data.ids;
    let msg;
    if(/^\d+(,\d+)*$/.test(ids)){
        const arr = ids.split(',');
        const connection = await mysql.createConnection(config.mysqlDB);
        const [result] = await connection.execute(`DELETE from user where user_type<>1 and user_type<>2 and id in (${arr.map(() => '?').join(',')})`, arr);
        msg = result.affectedRows > 0 ? '':'删除用户失败！';
        await connection.end();
    }else{
        msg = 'ID参数不合法';
    }
    ctx.body = {
        success: !msg,
        message: msg,
        data: {}
    }
}
//用户上传头像
async function upUserPic(ctx) {
    let pic = ctx.request.body.pic;
    let msg = common.pic_reg.test(pic) ? null : common.pic_txt;
    if(!msg){
        const connection = await mysql.createConnection(config.mysqlDB);
        const [result] = await connection.execute('UPDATE user SET user_pic=? where id=?', [pic,ctx.state.userInfo.id >> 0]);
        msg = result.affectedRows === 1 ? '' : '更新头像失败';
        await connection.end();
    }
    ctx.body = {
        success: !msg,
        message: msg,
        data: {pic}
    }
}
//保存用户
async function updateUser(ctx) {
    let data = ctx.request.body;
    data.user_type = data.user_type >> 0;
    data.user_type = 1 === data.user_type ? 4 : data.user_type;
    let msg,arr = [];
    const obj = {
        user_name:'用户帐号',
        user_email:'用户邮箱',
        pass_word:'用户密码',
        user_type:'用户类型',
        user_pic:'用户头像'
    };
    const array = Object.getOwnPropertyNames(obj);
    array.forEach(key=>{
        if(data[key]==='' && key !=='user_pic' &&!msg){
            msg = obj[key]+'不能为空！';
        }
        arr.push(data[key]);
    });
    if (!common.name_reg.test(data.user_name)) {
        msg = common.name_txt;
    } else if (!common.pass_reg.test(data.pass_word)) {
        msg = common.pass_txt;
    } else if (!common.email_reg.test(data.user_email)) {
        msg = common.email_txt;
    }
    if(!msg){
        let id = data.id >> 0;
        const connection = await mysql.createConnection(config.mysqlDB);
        if(id){
            array.splice(0,2);//修改时不能修改帐号和邮箱
            arr.splice(0,2);
            if(data.pass_word === common.defaultPassword){
                array.shift();//不修改原密码
                arr.shift();
            }
            arr.push(id);
            const [result] = await connection.execute(`UPDATE user SET ${array.map(k=>k+'=?').join(',')} where id=?`, arr);
            msg = result.affectedRows === 1 ? '' : '修改用户失败';
        }else{
            array.push('create_time');
            arr.push(new Date().toLocaleString());
            arr[2] = bcrypt.hashSync(data.pass_word, bcrypt.genSaltSync(10));//加密密码
            //先检查是否占用帐号
            const [rows] = await connection.execute('SELECT user_name,user_email FROM `user` where `user_name`=? or `user_email`=?', [data.user_name,data.user_email]);
            if(rows.length > 0) {
                msg = rows[0].user_name === data.user_name ? '帐号已经被占用！' : '邮箱已经被占用！';
            }else{
                const [result] = await connection.execute(`INSERT INTO user (${array.join(',')}) VALUES (${array.map((()=>'?')).join(',')})`, arr);
                msg = result.affectedRows === 1 ? '' : '添加用户失败';
            }
        }
        await connection.end();
    }
    ctx.body = {
        success: !msg,
        message: msg,
        data: {}
    }
}
//获取用户信息
async function getUserById(ctx) {
    let id = ctx.request.body.id >> 0;
    const connection = await mysql.createConnection(config.mysqlDB);
    const [list] = await connection.execute("SELECT * FROM user where id=?", [id]);
    const success = list.length === 1;
    await connection.end();
    ctx.body = {
        success,
        message: success ? '' : '查无此用户',
        data: success ? list[0] : {}
    }
}
//用户登录
async function login(ctx) {
    const data = ctx.request.body;
    let msg;
    if (!common.name_reg.test(data.user_name)) {
        msg = common.name_txt;
    } else if (!common.pass_reg.test(data.pass_word)) {
        msg = common.pass_txt;
    } else {
        //初步验证通过，开始查询数据库
        const connection = await mysql.createConnection(config.mysqlDB);
        const [rows] = await connection.execute('SELECT * FROM `user` where `user_name`=?', [data.user_name]);
        msg = '用户名或密码错误！';//不应该具体透露是密码还是帐户出错！
        if (rows.length) {
            const userInfo = rows[0];
            if (bcrypt.compareSync(data.pass_word, userInfo.pass_word)) {
                if (userInfo.user_type === 0) {
                    msg = '此帐号正在审核中！';
                }else{
                    const ip = config.getClientIP(ctx);
                    await connection.execute('UPDATE `user` SET `login_ip`=? where `id`=?', [ip, userInfo.id]);
                    delete userInfo.pass_word;
                    return ctx.body = {
                        success: true,
                        data: {
                            userInfo,
                            token: jwt.sign(Object.assign({ip}, userInfo),
                                config.JWTs.secret, {expiresIn: config.JWTs.expiresIn})
                        }
                    }
                }
            }
        }
        await connection.end();
    }
    ctx.body = {
        success: false,
        message: msg,
        data: {}
    };
}

//修改密码
async function changePassword(ctx) {
    const data = ctx.request.body;
    let err;
    const obj = {
        old_password:'旧密码',
        pass_word:'新密码',
        pass_words:'确认密码'
    };
    for(let key in obj){
        if (!common.pass_reg.test(data[key])) {
            err = obj[key]+'格式不正确！';
            break;
        }
    }
    if (!err && data.old_password === data.pass_words) {
        err = '旧密码不能与新密码相同！';
    } else if (!err && data.pass_word !== data.pass_words) {
        err = '新密码与确认密码不相同！';
    }
    if(!err){
        const user = ctx.state.userInfo;//获取用户信息
        const connection = await mysql.createConnection(config.mysqlDB);
        const [rows] = await connection.execute('SELECT `pass_word` FROM `user` where `id`=?', [user.id]);
        if(rows.length && bcrypt.compareSync(data.old_password,rows[0].pass_word)){
            const password = bcrypt.hashSync(data.pass_word, bcrypt.genSaltSync(10));//加密新密码
            const result = await connection.execute('update `user` set `pass_word`=? where `id`=?', [password, user.id]);
            err = result.affectedRows === 0 ? '修改密码失败！':'';
        }else{
            err = '旧密码不正确！';
        }
        await connection.end();
    }
    ctx.body = {
        success: !err,
        message: err,
        data: {}
    }
}

//保存上传记录
async function saveUpFile(arr) {
    const connection = await mysql.createConnection(config.mysqlDB);
    const [result] = await connection.execute('INSERT INTO `upload` (user_id,file_name,file_path,mime_type,file_size,is_delete,create_time) VALUES (?,?,?,?,?,?,?)', arr);
    await connection.end();
    return result;
}
//上传文件列表
async function listUpFile(ctx) {
    const data = ctx.request.body;
    let pageSize = Math.abs(data.pageSize >> 0)||10;
    let page = Math.abs(data.page >> 0)||1;//当前页码
    const connection = await mysql.createConnection(config.mysqlDB);
    const [rows] = await connection.execute('SELECT SQL_NO_CACHE COUNT(*) as total FROM `upload`', []);
    const total = rows[0].total;//总数量
    const pages = Math.ceil(total/pageSize);
    if(page > pages){
        page = Math.max(1,pages);//以防没数据
    }
    console.log((page - 1) * pageSize,page * pageSize);
    const [list] = await connection.execute('SELECT a.*,u.`user_name` FROM upload as a LEFT JOIN user as u on a.user_id = u.id LIMIT ?, ?', [(page - 1) * pageSize,pageSize]);
    await connection.end();
    list.forEach(obj=>{
        obj.full_path = common.web_domain + obj.file_path.replace(/\\/g,'/').replace('dist/','/');
    });
    ctx.body = {
        success: true,
        message: '',
        data: {
            page,total,data:list
        }
    }
}
//删除上传文件列表
async function delFile(ctx) {
    const data = ctx.request.body;
    let ids = data.id;
    let arr = ids.split(',');
    let msg;
    if(/^\d+(,\d+)*$/.test(ids)){
        ids = arr.map(() => '?').join(',');
        const connection = await mysql.createConnection(config.mysqlDB);
        const [rows] = await connection.execute(`SELECT file_path FROM upload where id in (${ids})`, arr);
        if(rows.length){
            for(let i = rows.length;i--;){
                const path = rows[i].file_path.replace(/\\/g,'/');
                if(path.startsWith(config.upPath)){
                    try{
                        fs.unlinkSync(path);
                    }catch(e){}
                }
            }
            if(data.delRecord === 'true'){
                await connection.execute(`DELETE from upload where id in (${ids})`, arr);
            }
        }else{
            msg = '无此记录';
        }
        await connection.end();
    }else{
        msg = 'ID参数不合法';
    }
    ctx.body = {
        success: !msg,
        message: msg,
        data: {}
    }
}

export default {
    listReport,
    deleteReport,
    report,
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
