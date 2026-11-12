import http from '@/axios/index.js'

export const listLabels = () => http.get('/labels')
export const saveLabel = ({ id, kind, name, color }) => id
  ? http.put(`/labels/${id}`, { kind, name, color })
  : http.post('/labels', { kind, name, color })
export const deleteLabel = id => http.delete(`/labels/${id}`)
export const assignLabels = data => http.put('/labels/assignments', data)
