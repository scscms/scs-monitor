// vue mixins
const ajax = require('./ajax').default
const storage = require('./storage').default
export default {
  data() {
    return {
      showSort: !0,
      userInfo: {},
      search_data: { sort_id: '' },
      sortType: {}
    }
  },
  methods: {
    handleSizeChange(val) {
      this.search_data.pageSize = val
      this.ajaxData()
    },
    getLogType(t) {
      // API:,warn:,error:,SCRIPT,other
      let s = 'other'
      if (t.includes('API:')) {
        s = 'api'
      } else if (t.includes('warn:')) {
        s = 'warn'
      } else if (t.includes('error:')) {
        s = 'error'
      } else if (t.includes('fps:')) {
        s = 'fps'
      } else if (t.includes('pv:')) {
        s = 'view'
      } else if (t.includes('script:')) {
        s = 'script'
      }
      return s
    },
    dealUserInfo(o) {
      if (this.hasOwnProperty('userInfo')) {
        this.userInfo = o
      }
      const g = this.grade
      if (g) {
        const p = this.page_grade
        for (let k in g) {
          if (g.hasOwnProperty(k)) {
            g[k] = p[k] < o.user_type
          }
        }
      }
    }
  },
  created() {
    this.dealUserInfo(this.$store.state.userInfo.data)
    ajax.call(this, '/project', {}, (d, err) => {
      if (!err) {
        const t = this.sortType
        d.data.forEach(obj => {
          t[obj.code] = obj.name
        })
        // 特定用户
        storage.get('userInfo', obj => {
          if (Object.keys(t).includes(obj.userInfo.user_name)) {
            this.showSort = !1
            this.search_data.sort_id = t
          }
        })
      }
    })
  },
  watch: {
    '$store.state.userInfo.data': 'dealUserInfo'
  }
}
