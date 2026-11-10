import {createApp} from 'vue';
import { CalendarDays, ChevronDown, ChevronRight, X } from '@lucide/vue';
import App from './App.vue';
import router from './router';
import './style.css';
import { init } from '@/init/init.js';
import { createPinia } from 'pinia';
import piniaPersistedState from 'pinia-plugin-persistedstate';
import 'element-plus/theme-chalk/dark/css-vars.css';
// 以函数方式调用的弹框和提示条需要全局样式（登录页等未经组件自动引入的地方）
import 'element-plus/es/components/message-box/style/css';
import 'element-plus/es/components/message/style/css';
import 'nprogress/nprogress.css';
import perm from "@/perm/perm.js";
const pinia = createPinia().use(piniaPersistedState)
import i18n from "@/i18n/index.js";
const app = createApp(App).use(pinia)
app.component('MailChevronDown', ChevronDown)
app.component('MailChevronRight', ChevronRight)
app.component('MailCloseIcon', X)
app.component('MailCalendarIcon', CalendarDays)
await init()
app.use(router).use(i18n).directive('perm',perm)
app.config.devtools = true;

app.mount('#app');
