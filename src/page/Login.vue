<template>
  <div class="scs-screen login">
    <el-row class="content">
      <div class="logo"></div>
      <el-row>
        <el-form label-width="0px" :model="data" :rules="rule_data" ref="loginForm">
          <el-form-item prop='user_name'>
            <el-input type="text" placeholder="账号" v-model="data.user_name"
                      :disabled="loading" autofocus @keyup.native.enter="login()"></el-input>
          </el-form-item>
          <el-form-item prop='pass_word'>
            <el-input type="password" placeholder="密码" v-model="data.pass_word"
                      :disabled="loading" @keyup.native.enter="login()"></el-input>
          </el-form-item>
        </el-form>
        <el-button type="primary" @click="login" :disabled="loading">登录</el-button>
      </el-row>
    </el-row>
  </div>
</template>

<script>
import common from '../../server/common'
import utils from '@/utils/index'

export default {
  data() {
    return {
      data: {
        user_name: '',
        pass_word: ''
      },
      placeholder: {
        name: common.name_txt,
        pass: common.pass_txt,
        email: common.email_txt
      },
      loading: false,
      rule_data: {
        user_name: [{
          required: true,
          message: '帐号不能为空！',
          trigger: 'change'
        }, {
          pattern: common.name_reg,
          message: common.name_txt,
          trigger: 'change'
        }],
        pass_word: [{
          required: true,
          message: '密码不能为空！',
          trigger: 'change'
        }, {
          pattern: common.pass_reg,
          message: common.pass_txt,
          trigger: 'change'
        }]
      }
    }
  },
  mounted() {
    utils.storage.remove('userInfo')
  },
  methods: {
    login() {
      this.$refs.loginForm.validate(valid => {
        if (valid && !this.loading) {
          this.loading = true
          utils.ajax.call(this, '/login', this.data, (data, err) => {
            this.loading = false
            if (!err) {
              utils.storage.set('userInfo', data, () => {
                let url = this.$route.query.url || '/Report/list'
                url = url.includes('login') ? '/Report/list' : url
                this.$router.replace(url)
              })
            }
          })
        }
      })
    }
  }
}
</script>

<style lang="less">
  .login {
    background: #373a42 url('../assets/bg.jpg') no-repeat center;
    background-size: cover;
    .el-dialog__body {
      padding-bottom: 0
    }
    .content {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -70%);
      background: #fff;
      background-clip: padding-box;
      box-shadow: 0 6px 12px rgba(0, 0, 0, .4);
      border: 5px solid rgba(0, 100, 200, .3);
      padding: 16px;
      width: 30%;
      min-width: 300px;
      max-width: 400px;
      border-radius: 10px;
      .logo {
        background: url('../assets/logo.png') no-repeat center 0;
        height: 64px;
        margin-bottom: 15px;
      }
      .el-button {
        margin-left: 20px;
        float: right
      }
    }
  }
</style>
