<template>
    <div>
        <div class="myChart">
            <canvas ref="chart"></canvas>
        </div>
        <el-row class="grid-table">
            <el-form :inline="true" :model='search_data'>
                <el-form-item>
                    <el-input size="small" placeholder="页面地址" v-model="search_data.url"></el-input>
                </el-form-item>
                <el-form-item v-if="showSort">
                    <el-select size="small" placeholder="选择项目" clearable v-model="search_data.sort_id">
                        <el-option v-for="(value,key) in sortType" :key="key"
                                   :label="value" :value="key">
                        </el-option>
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-date-picker v-model="dateRange" type="daterange" size="small"
                        range-separator=" 至 " placeholder="选择日期范围">
                    </el-date-picker>
                </el-form-item>
                <el-form-item style="text-align: right">
                    <el-button size="small" icon="search" @click='onSearch'>查询</el-button>
                </el-form-item>
            </el-form>
            <el-button type="danger" :disabled="grade.deleteReport" @click='deleteReport()'>批量删除</el-button>
            <el-table stripe border style="width:100%;margin-top:10px" :data="table_data.data" @selection-change="handleSelectionChange" @expand-change="expandChange">
                <el-table-column type="selection" width="38"></el-table-column>
                <el-table-column type="expand">
                    <template slot-scope="props">
                        <keep-alive>
                        <div class="chart" :id="'chart'+props.row.id"><canvas></canvas></div>
                        </keep-alive>
                        <el-form label-position="left" inline class="table-expand">
                            <el-form-item label="用户："><span>{{ props.row.uin }}</span></el-form-item>
                            <el-form-item label="上报IP："><span>{{ props.row.ip }}</span></el-form-item>
                            <el-form-item label="系统："><span>{{props.row.os}}
                                <strong>宽：</strong>{{props.row.screen_width}}
                                <strong>高：</strong>{{ props.row.screen_height}}
                                <strong>像素比：</strong>{{ props.row.pixel_ratio}}</span></el-form-item>
                            <el-form-item label="来源页："><span>{{ props.row.referrer }}</span></el-form-item>
                            <el-form-item label="来源方式："><span>{{props.row.enter}}
                            <strong>重定向：</strong>{{ props.row.redirect_count}}次
                            </span></el-form-item>
                            <el-form-item label="浏览器："><span>{{ props.row.browser }}</span></el-form-item>
                        </el-form>
                    </template>
                </el-table-column>
                <el-table-column type="index" width="50"></el-table-column>
                <el-table-column
                    v-for="item in table_data.columns"
                    :label="item.name"
                    :key="item.key"
                    :prop="item.key"
                    :formatter="columnFormatter"
                    :min-width="item.minWidth" :width="item.width">
                </el-table-column>
            </el-table>
            <el-pagination
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
                :current-page="search_data.page"
                :page-sizes="page_sizes"
                :page-size="search_data.pageSize"
                layout="sizes, total, prev, pager, next,jumper"
                :total="table_data.total">
            </el-pagination>
        </el-row>
    </div>
</template>
<script type="text/javascript">
import utils from '@/utils/index'
import common from '../../../server/common'
export default {
  name: 'list',
  data() {
    return {
      page_grade: common.page_grade,
      page_sizes: common.page_sizes,
      grade: {
        deleteReport: !0
      },
      chartObj: null,
      options: {
        type: 'bar',
        data: {
          labels: [],
          datasets: []
        },
        options: {
          aspectRatio: 4,
          responsive: true,
          title: {
            display: true,
            text: '首屏性能测试'
          },
          tooltips: {
            mode: 'index',
            intersect: false
          },
          scales: {
            xAxes: [{
              stacked: true
            }],
            yAxes: [{
              stacked: true
            }]
          }
        }
      },
      dateRange: '',
      search_data: {
        table: 'performance',
        url: '',
        sort_id: '',
        begin: 0,
        end: 0,
        page: 1,
        pageSize: 10
      },
      entryMode: {
        0: '普通进入',
        1: '刷新进入',
        2: '历史记录',
        255: '其他方式'
      },
      // 表格数据
      multipleSelection: [],
      table_data: {
        columns: [
          { 'key': 'code', 'name': '项目', minWidth: 115 },
          { 'key': 'url', 'name': '页面', width: 120 },
          { 'key': 'browser_type', 'name': '浏览器', width: 100 },
          { 'key': 'redirect', 'name': '重定向耗时', width: 100 },
          { 'key': 'dns_lookup', 'name': 'CDN耗时', width: 90 },
          { 'key': 'tcp_connect', 'name': 'TCP耗时', width: 90 },
          { 'key': 'request', 'name': '请求耗时', width: 90 },
          { 'key': 'response', 'name': '响应耗时', width: 90 },
          { 'key': 'first_paint', 'name': '白屏时间', width: 90 },
          { 'key': 'dom_complete', 'name': '渲染耗时', width: 90 },
          { 'key': 'dom_ready', 'name': '准备耗时', width: 90 },
          { 'key': 'dom_load', 'name': '加载耗时', width: 90 },
          { 'key': 'occurrence', 'name': '时间', width: 170 }
        ],
        total: 0,
        data: []
      }
    }
  },
  methods: {
    deleteReport(arr) {
      if (!arr) {
        if (this.multipleSelection.length) {
          arr = this.multipleSelection
        } else {
          return this.$message('请先选择上报')
        }
      }
      this.$confirm(`确定要${arr.length > 1 ? '批量删除上报' : '删除此上报'}吗？`, '系统提醒', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        utils.ajax.call(this, '/deleteReport', { ids: arr.map(o => o.id).join(','), table: 'performance' }, (d, err) => {
          !err && this.ajaxData()
        })
      }).catch(() => {})
    },
    handleSelectionChange(val) {
      this.multipleSelection = val
    },
    // 格式化输出内容
    columnFormatter(row, column) {
      let key = column.property
      let str = row[key]
      str = str === 0 ? 0 : str || ''
      if (key === 'occurrence') {
        let t = new Date(str)
        str = utils.formatDate('yyyy-mm-dd hh:mm:ss', t)
      } else if (key === 'code') {
        str = this.sortType[str] || '未知'
      }
      return str
    },
    // ajax请求列表数据
    ajaxData() {
      if (this.dateRange[0]) {
        this.search_data.begin = utils.formatDate('yyyy-mm-dd', this.dateRange[0])
        this.search_data.end = utils.formatDate('yyyy-mm-dd', this.dateRange[1])
      } else {
        this.search_data.begin = this.search_data.end = ''
      }
      utils.ajax.call(this, '/listReport', this.search_data, (obj, err) => {
        if (!err) {
          this.table_data.data = obj.data
          this.table_data.total = obj.total
          this.search_data.page = obj.page
          // 渲染图表
          let o = this.options
          let w = window.innerWidth
          o.options.aspectRatio = w > 1400 ? 4 : w > 1000 ? 3 : 2
          const arr = ['redirect', 'dns_lookup', 'tcp_connect', 'request', 'response', 'first_paint', 'dom_complete', 'dom_ready', 'dom_load']
          o.data.datasets = []
          o.data.labels = []
          arr.forEach((k, i) => {
            o.data.datasets.push({
              label: k,
              backgroundColor: this.randomColor(i),
              borderColor: this.randomColor(i + 1),
              fill: false,
              data: []
            })
          })
          obj.data.forEach((row, i) => {
            o.data.labels.push(i + 1)
            row.enter = this.entryMode[row.type]
            o.data.datasets.forEach(obj => {
              obj.data.push(row[obj.label])
            })
          })
          this.chartObj.update()
        }
      })
    },
    randomColor(index) {
      const color = [
        '#FF6600',
        '#FFCC33',
        '#99CC33',
        '#33CC99',
        '#FFFF00',
        '#99CC33',
        '#009966',
        '#0099CC',
        '#FF9900'].reverse()
      index = index >= color.length ? Math.random() * color.length : index
      return color[index >> 0]
    },
    // 点击查询
    onSearch() {
      this.ajaxData()
    },
    handleCurrentChange(page) {
      if (page !== this.search_data.page) {
        this.search_data.page = page
        this.ajaxData()
      }
    },
    createChart(row, dom) {
      let config = {
        type: 'pie',
        data: {
          datasets: [{
            data: [],
            backgroundColor: []
          }],
          labels: []
        },
        options: {
          legend: { display: false }
        }
      }
      JSON.parse(row.entries).forEach((o, i) => {
        let d = o.duration
        if (d) {
          let k = /.+\/([^?#]+)/.exec(o.url)
          k = k ? k[1] : o.type
          config.data.datasets[0].data.push(d)
          config.data.datasets[0].backgroundColor.push(this.randomColor(i))
          config.data.labels.push(k)
        }
      })
      this.$chart(dom.getContext('2d'), config)
    },
    expandChange(row) {
      this.$nextTick(() => {
        let dom = document.querySelector(`#chart${row.id} canvas`)
        dom && this.createChart(row, dom)
      })
    }
  },
  mounted() {
    this.chartObj = new this.$chart(this.$refs.chart.getContext('2d'), this.options)
    this.ajaxData()
  },
  mixins: [utils.mixin]
}
</script>
<style lang="less">
    .myChart{
        margin-bottom: 10px;
        border:1px solid #cacaca;
        overflow: hidden;
        display: flex;
        width:100%;
        text-align: center;
        li{
            flex:1;
            width:25%
        }
    }
    .chart{
        position: absolute;
        z-index: 4;
        top:20px;
        left:800px;
        width:300px;
    }
    .grid-table .el-table__expanded-cell{
        span{color:#a8b3c3}
        strong{
            margin-left:8px;
            color:#2d3c52
        }
    }
</style>
