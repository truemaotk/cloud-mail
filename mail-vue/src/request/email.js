import http from '@/axios/index.js';

export function emailList(accountId, allReceive, emailId, timeSort, size, type, full, searchParams = {}) {
    const {type: searchType, text, startDate, endDate} = searchParams
    return http.get('/email/list', {params: {accountId, allReceive, emailId, timeSort, size, type, full, searchType, text, startDate, endDate}})
}

export function emailDelete(emailIds) {
    return http.delete('/email/delete?emailIds=' + emailIds)
}

export function emailLatest(emailId, accountId, allReceive) {
    return http.get('/email/latest', {params: {emailId, accountId, allReceive}, noMsg: true, timeout: 35 * 1000})
}

export function emailUnreadCounts() {
    return http.get('/email/unreadCounts', {noMsg: true, timeout: 10000})
}

export function emailRead(emailIds, unread = false) {
    return http.put('/email/read', {emailIds, unread})
}

export function workspaceList(folder, accountId, offset, size, search, unread) {
    return http.get('/email/workspace/list', { params: {
        folder, accountId, offset, size, unread: unread ? 1 : 0,
        searchType: search?.type, text: search?.text, startDate: search?.startDate, endDate: search?.endDate,
    }, timeout: 15000 })
}

export function workspaceDetail(folder, accountId, emailId) {
    return http.get('/email/workspace/detail', { params: { folder, accountId, emailId }, timeout: 15000 })
}

export function workspaceMove(action, emailIds, until) {
    const path = ['trash', 'restore', 'purge'].includes(action) ? '/email/delete/workspace' : '/email/workspace/move'
    return http.put(path, { action, emailIds, until }, { timeout: 15000 })
}

export function emailSend(form,progress) {
    return http.post('/email/send', form,{
        onUploadProgress: (e) => {
            progress(e)
        },
        noMsg: true
    })
}
