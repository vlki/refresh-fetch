// @flow
/* global fetch */

import merge from 'lodash/merge'

type ResponseBody = Object | null | string

const fetchJSON = (url: string | Request | URL, options: Object = {}) => {
  const jsonOptions = merge({
    headers: {
      'Content-Type': 'application/json'
    }
  }, options)

  // $FlowIssue
  return fetch(url, jsonOptions)
    .then((response: Response) => {
      return getResponseBody(response).then(body => ({
        response,
        body
      }))
    })
    .then(checkStatus)
}

const getResponseBody = (response: Response): Promise<ResponseBody> => {
  const contentType = response.headers.get('content-type')
  return contentType.indexOf('json') >= 0 ? response.text().then(tryParseJSON) : response.text()
}

const tryParseJSON = (json: string): Object | null => {
  if (!json) {
    return null
  }

  try {
    return JSON.parse(json)
  } catch (e) {
    throw new Error(`Failed to parse unexpected JSON response: ${json}`)
  }
}

function ResponseError (status: number, response: Response, body: ResponseBody) {
  this.name = 'ResponseError'
  this.status = status
  this.response = response
  this.body = body
}

// $FlowIssue
ResponseError.prototype = Error.prototype

const checkStatus = ({ response, body }) => {
  if (response.ok) {
    return { response, body }
  } else {
    throw new ResponseError(response.status, response, body)
  }
}

export default fetchJSON
