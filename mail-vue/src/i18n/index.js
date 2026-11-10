import { createI18n } from 'vue-i18n';
import en from './en.js'
import zh from './zh.js'
import { en as projectEn, zh as projectZh } from './project-help.js'
const i18n = createI18n({
    legacy: false,
    messages: {
        zh: { ...zh, project: projectZh },
        en: { ...en, project: projectEn },
    },
});

export default i18n;
