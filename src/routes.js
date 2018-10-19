import common from '../server/common'
import Login from '@/page/Login.vue'
import NoFind from '@/page/NoFind.vue'
import Home from '@/page/Home.vue'
import ReportList from '@/page/Report/list.vue'
import UpFileList from '@/page/UpFile/list.vue'
import userList from '@/page/User/list.vue'
import userAdd from '@/page/User/add.vue'
import project from '@/page/Report/project.vue'
import performance from '@/page/Report/performance.vue'
// 在meta中可添加show:false,//是否显示此菜单属性
export default {
  mode: 'history',
  base: __dirname,
  routes: [
    {
      path: '*',
      name: '/404',
      component: NoFind
    }, {
      path: '/',
      redirect: '/login'
    }, {
      path: '/login',
      name: 'login',
      meta: {
        title: '登录'
      },
      component: Login
    }, {
      path: '/Report',
      meta: {
        verify: true,
        title: '网站监控',
        icon: 'fa fa-file-text-o'
      },
      component: Home,
      redirect: '/Report/project',
      children: [{
        path: 'project',
        meta: {
          verify: true,
          grade: common.page_grade.project,
          title: '监控项目',
          icon: 'fa fa-newspaper-o'
        },
        component: project
      }, {
        path: 'list',
        meta: {
          verify: true,
          grade: common.page_grade.listReport,
          title: '监控数据',
          icon: 'fa fa-newspaper-o'
        },
        component: ReportList
      }, {
        path: 'performance',
        meta: {
          verify: true,
          grade: common.page_grade.performance,
          title: '性能数据',
          icon: 'fa fa-newspaper-o'
        },
        component: performance
      }]
    }, {
      path: '/user',
      meta: {
        verify: true,
        title: '用户管理',
        icon: 'fa fa-user-o'
      },
      redirect: '/user/list',
      component: Home,
      children: [{
        path: 'list',
        meta: {
          verify: true,
          grade: common.page_grade.userList,
          title: '用户列表',
          icon: 'fa fa-address-card-o'
        },
        component: userList
      }, {
        path: 'add',
        meta: {
          verify: true,
          grade: common.page_grade.updateUser,
          title: '添加用户',
          icon: 'fa fa-user-plus'
        },
        component: userAdd
      }, {
        path: 'edit/:id',
        meta: {
          verify: true,
          title: '编辑用户',
          icon: 'fa fa-user-times'
        },
        component: userAdd
      }]
    }, {
      path: '/upfile',
      meta: {
        verify: true,
        title: '上传管理',
        icon: 'fa fa-upload'
      },
      component: Home,
      redirect: '/upfile/list',
      children: [{
        path: 'list',
        meta: {
          verify: true,
          grade: common.page_grade.listUpFile,
          title: '上传列表',
          icon: 'fa fa-files-o'
        },
        component: UpFileList
      }]
    }
  ]
}
