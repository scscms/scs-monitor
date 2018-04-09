<template>
    <div>
        <el-row class="grid-table">
            <el-form :inline="true" :model='search_data'>
                <el-form-item>
                    <el-input size="small" placeholder="错误标题" v-model="search_data.title"></el-input>
                </el-form-item>
                <el-form-item v-if="showSort">
                    <el-select size="small" placeholder="选择项目" clearable v-model="search_data.sort_id">
                        <el-option v-for="(value,key) in sort_type" :key="key"
                                   :label="value" :value="key">
                        </el-option>
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-date-picker v-model="dateRange" type="daterange" size="small"
                        range-separator=" 至 " placeholder="选择日期范围">
                    </el-date-picker>
                </el-form-item>
                <el-form-item>
                    <el-button size="small" icon="search" @click='onSearch'>查询</el-button>
                </el-form-item>
            </el-form>
            <el-button type="danger" :disabled="grade.deleteReport" @click='deleteReport()'>批量删除</el-button>
            <el-table stripe border style="width:100%;margin-top:10px" :data="table_data.data" @selection-change="handleSelectionChange">
                <el-table-column type="selection" width="55"></el-table-column>
                <el-table-column type="expand">
                    <template slot-scope="props">
                        <el-form label-position="left" inline class="table-expand">
                            <el-form-item label="用户："><span>{{ props.row.uin }}</span></el-form-item>
                            <el-form-item label="上报IP："><span>{{ props.row.ip }}</span></el-form-item>
                            <el-form-item label="入库时间："><span>{{ props.row.create_time }}</span></el-form-item>
                            <el-form-item label="上报来路："><span>{{ props.row.referrer }}</span></el-form-item>
                            <el-form-item label="错误来源："><span>{{ props.row.url }}</span></el-form-item>
                            <el-form-item label="浏览器："><span>{{ props.row.browser }}</span></el-form-item>
                        </el-form>
                    </template>
                </el-table-column>
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
                @current-change="handleCurrentChange"
                :current-page="search_data.page"
                :page-size="search_data.pageSize"
                layout="total, prev, pager, next,jumper"
                :total="table_data.total">
            </el-pagination>
        </el-row>
    </div>
</template>
<script type="text/javascript">
    import {ajax,storage,formatDate} from 'utils';
    import common from 'common';
    module.exports = {
        name: 'list',
        data() {
            return {
                page_grade:common.page_grade,
                grade:{
                    deleteReport: !0,
                },
                userInfo:{},
                dateRange:'',
                showSort:!0,
                search_data: {
                    title: '',
                    sort_id: '',
                    begin: 0,
                    end: 0,
                    page: 1,
                    pageSize: 10
                },
                sort_type:common.sort_type,
                //表格数据
                multipleSelection:[],
                table_data: {
                    columns: [
                        {"key": "code", "name": "项目", width: 115},
                        {"key": "title", "name": "监控标题", minWidth: 120},
                        {"key": "amount", "name": "统计", width: 80},
                        {"key": "info", "name": "监控信息", minWidth: 220},
                        {"key": "occurrence", "name": "监控时间", width:175}
                    ],
                    total: 0,
                    data: []
                }
            }
        },
        created(){
            //特定用户
            storage.get('userInfo',obj=>{
                const t = common.sort_type;
                let name = obj.userInfo.user_name;
                Object.keys(t).forEach(k=>{
                    if(name === t[k]){
                        this.showSort = !1;
                        this.search_data.sort_id = k;
                    }
                })
            });
        },
        methods: {
            deleteReport(arr){
                if(!arr){
                    if(this.multipleSelection.length){
                        arr = this.multipleSelection;
                    }else{
                        return this.$message("请先选择上报");
                    }
                }
                this.$confirm(`确定要${arr.length>1?'批量删除上报':'删除此上报'}吗？`, '系统提醒', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then(() => {
                    ajax.call(this, '/deleteReport', {ids:arr.map(o=>o.id).join(",")}, (d, err) => {
                        !err && this.ajaxData();
                    })
                }).catch(() => {});
            },
            handleSelectionChange(val){
                this.multipleSelection = val;
            },
            //格式化输出内容
            columnFormatter(row, column){
                let key = column.property;
                let str = row[key]||'';
                let h = this.$createElement;
                if(key === 'occurrence'){
                    if(str > 1.5e12){
                        let t = new Date();
                        t.setTime(str);
                        str = formatDate('yyyy-mm-dd hh:mm:ss',t);
                    }else{
                        str = row.create_time;
                    }
                }else if(key === 'title' && str.includes('API:')){
                    str += '请求耗时(毫秒)';
                }else if(key === 'code'){
                    str = common.sort_type[str]||'未知';
                }
                return str;
            },
            //ajax请求列表数据
            ajaxData(){
                if(this.dateRange[0]){
                    this.search_data.begin = formatDate('yyyy-mm-dd',this.dateRange[0]);
                    this.search_data.end = formatDate('yyyy-mm-dd',this.dateRange[1]);
                }else{
                    this.search_data.begin = this.search_data.end = 0;
                }
                ajax.call(this, '/listReport', this.search_data, (obj, err) => {
                    if (!err) {
                        this.table_data.data = obj.data;
                        this.table_data.total = obj.total;
                        this.search_data.page = obj.page;
                    }
                });
            },
            //点击查询
            onSearch() {
                this.ajaxData();
            },
            handleCurrentChange(page){
                if(page !== this.search_data.page){
                    this.search_data.page = page;
                    this.ajaxData();
                }
            },
        },
        mounted() {
            this.ajaxData();
        },
        mixins:[common.mixin],
    }
</script>
<style lang="less">
    .grid-table{
        .table-expand {
            font-size: 0;
            label {
                text-align: right;
                width: 90px;
                color: #99a9bf;
            }
            .el-form-item {
                margin-right: 0;
                margin-bottom: 0;
                width: 100%;
                height:28px;
                .el-form-item__content{
                    display: inline-block;
                    width: ~'calc(100% - 90px)';
                    vertical-align: top;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
            }
        }
        .el-form-item{
            display: inline-block;
            max-height:240px;
            width:~'calc(24% - 10px)';
            &:first-child{
                .el-input{
                    margin-right:25px;
                }
            }
            &:last-child{
                overflow: hidden;
                white-space: nowrap;
                vertical-align: bottom;
            }
            .el-date-editor.el-input{
                width:auto;
            }
        }
        .el-pagination{
            margin-top:5px;
            text-align: right;
        }
        .el-cascader--small .el-cascader__label{
            line-height: 40px;
        }
    }
</style>
