<template>
    <div>
        <ul class="myChart">
            <li><canvas ref="chart1"></canvas></li>
            <li><canvas ref="chart2"></canvas></li>
            <li><canvas ref="chart3"></canvas></li>
            <li><canvas ref="chart4"></canvas></li>
        </ul>
        <el-dialog :title="form_data.id ? '编辑项目' : '添加项目'" :visible.sync="dialogVisible" :rules="rules" width="500">
            <el-form ref="perfor" :rules="rules" :model='form_data' label-width="100px">
                <el-form-item label="编码" prop="code">
                    <el-input v-model="form_data.code" :disabled="form_data.id!==''"></el-input>
                </el-form-item>
                <el-form-item label="排序" prop="sort">
                    <el-slider v-model="form_data.sort" :max="99"></el-slider>
                </el-form-item>
                <el-form-item label="项目名称" prop="name">
                    <el-input v-model="form_data.name"></el-input>
                </el-form-item>
                <el-form-item label="项目域名" prop="domain">
                    <el-input v-model="form_data.domain"></el-input>
                </el-form-item>
                <el-form-item label="日志采集率">
                    <el-input-number v-model="form_data.log_odds" :min="0" :max="0.9" :step="0.1"></el-input-number>
                </el-form-item>
                <el-form-item label="性能采集率">
                    <el-input-number v-model="form_data.performance_odds" :min="0" :max="0.9" :step="0.1"></el-input-number>
                </el-form-item>
                <el-form-item>
                    <el-input type="textarea" :rows="2" v-model="form_data.comment">
                    </el-input>
                </el-form-item>
            </el-form>
            <span slot="footer" class="dialog-footer">
    <el-button @click="dialogVisible = false">取 消</el-button>
    <el-button type="primary" @click="saveProject">提交</el-button>
  </span>
        </el-dialog>

        <el-row class="grid-table">
            <el-button icon="el-icon-plus" type="success" style="float:right" @click="addProject">添加项目</el-button>
            <el-select placeholder="选择项目" @change="ajaxData" clearable v-model="search_data.sort_id">
                <el-option v-for="(value,key) in sortType" :key="key"
                           :label="value" :value="key">
                </el-option>
            </el-select>
            <el-table stripe border style="width:100%;margin-top:10px" :data="table_data.data">
                <el-table-column
                    show-overflow-tooltip
                    v-for="item in table_data.columns"
                    :render-header="renderHeader"
                    :key="item.key"
                    :prop="item.key"
                    :formatter="columnFormatter"
                    :min-width="item.minWidth" :width="item.width">
                </el-table-column>
            </el-table>
        </el-row>
    </div>
</template>
<script type="text/javascript">
import utils from '@/utils/index'
export default {
  name: 'project',
  data() {
    return {
      dialogVisible: !1,
      chartObj: {},
      doughnut: {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [],
            backgroundColor: ['#4dc9f6', '#f67019', '#f53794', '#537bc4', '#acc236', '#166a8f', '#00a950', '#58595b', '#8549ba']
          }],
          labels: []
        },
        options: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'title'
          }
        }
      },
      form_data: {
        id: '',
        sort: 0,
        code: '',
        name: '',
        domain: '',
        log_odds: 1,
        performance_odds: 1,
        comment: ''
      },
      rules: {
        code: [{ type: 'string', required: true, message: '请填写4-10个字符的编码', pattern: /^\w{4,10}$/ }],
        name: { required: true, message: '请填写项目名称', pattern: /(?!=.*['"])/ },
        domain: { required: true, message: '请正确填写项目域名+端口', pattern: /^https?:\/\/(\w+\.?)+(:\d+)?/ }
      },
      multipleSelection: [],
      table_data: {
        columns: [
          { 'key': 'code', 'name': '编码', width: 120 },
          { 'key': 'name', 'name': '项目名称', width: 120 },
          { 'key': 'domain', 'name': '域名(端口)', width: 150 },
          { 'key': 'log_odds', 'name': '日志机率?', width: 100, question: '日志采集机率：0至0.9' },
          { 'key': 'rc', 'name': '日志数', width: 150 },
          { 'key': 'performance_odds', 'name': '性能机率?', width: 100, question: '性能采集机率：0至0.9' },
          { 'key': 'fc', 'name': '首屏耗时', width: 100 },
          { 'key': 'comment', 'name': '说明', minWidth: 120 },
          { 'key': 'operations', 'name': '操作', width: 210 }
        ],
        data: []
      }
    }
  },
  methods: {
    // 格式化表格表头
    renderHeader(h, obj) {
      let key = obj.column.property
      let arr = this.table_data.columns
      for (let i = arr.length; i--;) {
        let obj = arr[i]
        if (obj.key === key) {
          let name = arr[i].name
          if (obj.question) {
            return h('el-tooltip', { props: { placement: 'top' }
            }, [h('div', { slot: 'content' }, obj.question),
              h('span', [name, h('i', { 'class': 'el-icon-question', style: { color: '#26bbf0', marginLeft: '2px' } })])
            ])
          } else {
            return name
          }
        }
      }
    },
    // 添加项目
    addProject() {
      this.dialogVisible = !0
      let d = this.form_data
      Object.keys(d).forEach(k => {
        d[k] = k.includes('odds') ? 0.9 : ''
      })
      d.sort = 50
    },
    // 保存项目
    saveProject() {
      this.$refs.perfor.validate((valid) => {
        if (valid) {
          utils.ajax.call(this, '/updateProject', this.form_data, (obj, err) => {
            if (!err) {
              this.dialogVisible = !1
              this.ajaxData()
            }
          })
        }
      })
    },
    ajaxData() {
      utils.ajax.call(this, '/project', { code: this.search_data.sort_id }, (obj, err) => {
        if (!err) {
          this.table_data.data = obj.data
          const Obj = this.chartObj
          for (let i = 5; --i;) {
            Obj['data' + i].options.title.text = ['日志统计', '首屏速度', '日志类型', '浏览器统计'][i - 1]
            Obj['data' + i].data.datasets[0].data = []
            Obj['data' + i].data.labels = []
          }
          obj.statistics.forEach(o => {
            Obj.data1.data.datasets[0].data.push(o.rc || 0)
            Obj.data2.data.datasets[0].data.push(o.fc || 0)
            obj.data.forEach(b => {
              if (b.code === o.code) {
                b.rc = o.rc
                b.fc = o.fc
              }
            })
            Obj.data1.data.labels.push(o.code)
            Obj.data2.data.labels.push(o.code)
          }, 0)
          const _obj = {
            api: 0, warn: 0, error: 0, script: 0, other: 0
          }
          obj.reports.forEach(o => {
            _obj[this.getLogType(o.t)] += o.counts
          }, 0)
          for (let k in _obj) {
            Obj.data3.data.datasets[0].data.push(_obj[k])
            Obj.data3.data.labels.push(k)
          }
          obj.performance.forEach(o => {
            Obj.data4.data.datasets[0].data.push(o.counts)
            Obj.data4.data.labels.push(o.browser_type)
          })
          for (let i = 5; --i;) {
            Obj['chart' + i].update()
          }
        }
      })
    },
    createButton(h, row, code, text) {
      let self = this
      return h('el-button', {
        props: { size: 'small' },
        on: {
          click() {
            self.healColumnClick(code, row)
          }
        }
      }, [text])
    },
    columnFormatter(row, column) {
      let key = column.property
      let str = row[key] || ''
      let h = this.$createElement
      if (key === 'operations') {
        return h('div', [
          this.createButton(h, row, 'edit', '编辑'),
          this.createButton(h, row, 'test', '测试'),
          this.createButton(h, row, 'delete', '删除')
        ])
      } else if (key.includes('odds')) {
        str = str === '0.0' ? '关闭' : str // this.ranking
      }
      return str
    },
    healColumnClick(code, row) {
      if (code === 'delete') {
        this.$confirm(`确定要删除此项目吗？`, '系统提醒', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          utils.ajax.call(this, '/updateProject', { id: row.id, del: true }, (d, err) => {
            !err && this.ajaxData()
          })
        }).catch(() => {})
      } else if (code === 'test') {
        utils.ajax.call(this, '/sendPipe', { url: row.domain }, (d, err) => {
          !err && this.$message({
            message: '首屏测试成功！',
            type: 'success'
          })
        })
      } else if (code === 'edit') {
        this.dialogVisible = !0
        Object.assign(this.form_data, row)
      }
    }
  },
  mounted() {
    this.ajaxData()
    const Obj = this.chartObj
    for (let i = 5; --i;) {
      Obj['data' + i] = JSON.parse(JSON.stringify(this.doughnut))
      Obj['chart' + i] = new this.$chart(this.$refs['chart' + i].getContext('2d'), Obj['data' + i])
    }
  },
  mixins: [utils.mixin]
}
</script>
