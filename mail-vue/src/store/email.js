import { defineStore } from 'pinia'
import { EmailUnreadEnum } from '@/enums/email-enum.js'
import { sanitizeEmailHtml } from '@/utils/email-html.js'
import { emailUnreadCounts } from '@/request/email.js'
import { useUserStore } from '@/store/user.js'

let unreadRequestVersion = 0

export const useEmailStore = defineStore('email', {
    state: () => ({
        deleteIds: 0,
        unreadByAccount: {},
        allUnreadTotal: 0,
        latestReceivedId: null,
        newMail: null,
        workspaceRevision: 0,
        starScroll: null,
        emailScroll: null,
        cancelStarEmailId: 0,
        addStarEmailId: 0,
        contentData: {
            email: null,
            mailbox: null,
            viewerId: null,
            delType: null,
            showStar: true,
            showReply: true,
            showUnread: false
        },
        sendScroll: null,
        detailMap: {},
        adminSearch: { text: '', type: 'name' },
        searchParams: {
            text: '',
            type: 'subject',
            startDate: '',
            endDate: '',
        },
    }),
    persist: {
        pick: ['contentData'],
    },
    getters: {
        unreadTotal: state => Object.values(state.unreadByAccount).reduce((total, count) => total + count, 0),
    },
    actions: {
        async refreshUnreadCounts() {
            const version = ++unreadRequestVersion
            try {
                const result = await emailUnreadCounts()
                if (version === unreadRequestVersion) {
                    const rows = Array.isArray(result) ? result : result.counts
                    this.unreadByAccount = Object.fromEntries(rows.map(({ accountId, unread }) => [accountId, unread]))
                    this.allUnreadTotal = rows.reduce((total, row) => total + (row.allUnread ?? row.unread), 0)
                    if (Number.isSafeInteger(result.latestId)) {
                        const previousId = this.latestReceivedId
                        this.latestReceivedId = Math.max(previousId ?? 0, result.latestId)
                        if (previousId !== null && result.latestId > previousId) {
                            const accounts = rows.filter(row => row.latestUnreadId > previousId).map(row => row.accountId)
                            const inboxes = rows.filter(row => row.latestInboxUnreadId > previousId).map(row => row.accountId)
                            if (accounts.length) this.newMail = { id: result.latestId, accounts, inboxes }
                        }
                    }
                }
            } catch {
                // Keep the last successful count while the connection is unavailable.
            }
        },
        clearUnreadCounts() {
            ++unreadRequestVersion
            this.unreadByAccount = {}
            this.allUnreadTotal = 0
            this.latestReceivedId = null
            this.newMail = null
        },
        setSearchParams(params) {
            this.searchParams = {
                ...this.searchParams,
                ...params,
            }
        },
        setAdminSearch(params) {
            this.adminSearch = { text: params.text, type: params.type }
        },
        fetchList(request) {
            return request(0).then(data => {
                request(1).then(fullData => {
                    const list = Array.isArray(fullData) ? fullData : fullData?.list
                    this.applyFullList(list)
                }).catch(e => {
                    console.error(e)
                })
                return data
            })
        },
        applyFullList(list) {
            if (!list?.length) return
            const currentId = this.contentData.email?.emailId
            for (const item of list) {
                if (!item?.emailId) continue
                if (item.content) item.content = sanitizeEmailHtml(item.content)
                if (!item.attList) item.attList = []
                // 完整列表可能早于「标已读」返回，避免把本地已读状态盖回未读
                const prev = this.detailMap[item.emailId]
                const keepRead = prev?.unread === EmailUnreadEnum.READ
                    || (currentId === item.emailId && this.contentData.email?.unread === EmailUnreadEnum.READ)
                if (keepRead) {
                    item.unread = EmailUnreadEnum.READ
                }
                this.detailMap[item.emailId] = item
                if (currentId && item.emailId === currentId) {
                    this.contentData.email = item
                }
            }
        },
        openMessage(email, mailbox, full = false) {
            const administrative = mailbox === 'all-mail'
            const personal = administrative ? Boolean(email.personalFolder) : mailbox !== 'trash'
            this.contentData = {
                email: full ? { ...email, content: sanitizeEmailHtml(email.content || '') } : this.toContentEmail(email),
                mailbox,
                viewerId: useUserStore().user.userId,
                delType: administrative ? 'physics' : 'logic',
                showStar: personal,
                showReply: personal,
                showUnread: mailbox === 'inbox',
            }
        },
        toContentEmail(email) {
            const id = email?.emailId
            if (id && this.detailMap[id]) {
                return this.detailMap[id]
            }
            return {
                ...email,
                emailId: id || 0,
                content: '',
                text: '',
                attList: [],
                recipient: email?.recipient || '[]',
            }
        },
        markListRead(emailId) {
            const scrolls = [this.emailScroll, this.starScroll, this.sendScroll]
            for (const scroll of scrolls) {
                const list = scroll?.emailList
                if (!list?.length) continue
                const item = list.find(e => e.emailId === emailId)
                if (item) item.unread = EmailUnreadEnum.READ
            }
        },
    },
})
