import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
    state: () => ({
        asideShow: window.innerWidth > 1024,
        navigationOrder: {},
        accountShow: false,
        wideReading: false,
        backgroundLoading: true,
        changeNotice: 0,
        writerRef: null,
        changePreview: 0,
        previewData: {},
        key: 0,
        dark: false,
        palette: 'graphite',
        motion: 'system',
        newMailSound: true,
        systemReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        asideCount: {
            email: 0,
            send: 0,
            sysEmail: 0
        }
    }),
    getters: {
        reduceMotion: state => state.motion === 'reduce' || (state.motion !== 'full' && state.systemReducedMotion),
    },
    actions: {
        showNotice() {
            this.changeNotice ++
        },
        previewNotice(data) {
            this.previewData = data
            this.changePreview ++
        }
    },
    persist: {
        pick: ['accountShow','dark','wideReading','navigationOrder','palette','motion','newMailSound'],
    },
})
