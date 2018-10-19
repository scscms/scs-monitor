import Vue from 'vue'
import Vuex from 'vuex'
const userInfo = require('./userInfo').default
Vue.use(Vuex)
export default new Vuex.Store({
  strict: process.env.NODE_ENV !== 'production',
  modules: {
    userInfo
  }
})
