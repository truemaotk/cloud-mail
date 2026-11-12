import { defineStore } from 'pinia'
import { listLabels } from '@/request/labels.js'

export const labelColors = {
  gray: '#7b818c', red: '#d05760', orange: '#c37936', green: '#4c8a63',
  blue: '#4f7dc4', purple: '#8865ba', pink: '#be6691',
}

export const useLabelsStore = defineStore('labels', {
  state: () => ({ owner: null, labels: [], mailboxAssignments: {}, dialog: null, lastMessageChange: null, requestVersion: 0 }),
  getters: {
    messageLabels: state => state.labels.filter(label => label.kind === 'message'),
    byId: state => Object.fromEntries(state.labels.map(label => [label.id, label])),
  },
  actions: {
    async load(owner = this.owner) {
      if (owner !== this.owner) {
        this.owner = owner
        this.labels = []
        this.mailboxAssignments = {}
        this.dialog = null
        this.lastMessageChange = null
      }
      const request = ++this.requestVersion
      if (!owner) return
      const data = await listLabels()
      if (request !== this.requestVersion) return
      this.labels = data.labels
      const mailboxAssignments = {}
      for (const { itemId, labelId } of data.mailboxAssignments) {
        const itemLabels = mailboxAssignments[itemId] ??= []
        itemLabels.push(labelId)
      }
      this.mailboxAssignments = mailboxAssignments
    },
    edit(kind, label = null) { this.dialog = { kind, label, items: [] } },
    manage(kind) { this.dialog = { kind, manage: true, items: [] } },
    assign(kind, items) {
      if (items.length) this.dialog = { kind, items }
    },
  },
})
