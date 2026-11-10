import db from './db.js'

export async function removeDrafts(ids) {
  const { draft, att } = db.value
  await db.value.transaction('rw', draft, att, async () => {
    await draft.bulkDelete(ids)
    await att.bulkDelete(ids)
  })
}

export async function saveDraft(form, draftId) {
  const { draft, att } = db.value
  const { attachments, draftId: id, ...fields } = form
  return db.value.transaction('rw', draft, att, async () => {
    if (draftId) {
      await draft.update(draftId, fields)
      await att.put({ draftId, attachments })
      return draftId
    }
    const newId = await draft.add(fields)
    await att.add({ draftId: newId, attachments })
    return newId
  })
}
