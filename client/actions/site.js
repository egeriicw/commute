import {push} from 'react-router-redux'
import {createAction} from 'redux-actions'
import uuid from 'uuid'

// site stuff
const addSite = createAction('add site')
export const createSite = (newSite) => {
  newSite.id = uuid.v4()
  return [
    addSite(newSite),
    push(`/organizations/${newSite.organizationId}`)
  ] // TODO save to server
}

const deleteLocally = createAction('delete site')
/* const deleteOnServer = (id) =>
  serverAction({
    url: `/api/site/${id}`,
    options: {
      method: 'delete'
    }
  }) */ // TODO delete on server
export const deleteSite = (id, organzationId) => [
  deleteLocally(id),
  push(`/organizations/${organzationId}`)
]
