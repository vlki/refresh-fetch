/* global fetch */

import merge from 'lodash/merge'

const fetchJSON = (input, init) => {
  const initJson = merge({
    headers: {
      'Content-Type': 'application/json'
    }
  }, init)

  return fetch(input, initJson)
    .then(parseJSON)
    .then(checkStatus)
}

const checkStatus = ({ response, body }) => {
  if (response.status >= 200 && response.status < 300) {
    return { response, body }
  } else {
    const error = new Error(response.statusText)
    error.response = response
    error.body = body
    throw error
  }
}

const parseJSON = response => {
  const isJsonResponse = response.headers.get('content-type') &&
    response.headers.get('content-type').toLowerCase().indexOf('application/json') >= 0

  if (isJsonResponse) {
    return response.json().then(body => ({ response, body }))
  } else {
    return Promise.resolve({ response, body: null })
  }
}

export default fetchJSON
