# Refresh Fetch

Wrapper around [fetch](https://developer.mozilla.org/en-US/docs/Web/API/GlobalFetch) capable of graceful authentication token refreshing.

For situations when there is API which issues authentication tokens on login endpoint, API requires you to add the authentication token to all requests, those tokens must be refreshed every X minutes, and you just want to call `fetch` and be abstracted away from the refreshing.

The following ES6 functions are required:

* [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
* [fetch](https://developer.mozilla.org/en-US/docs/Web/API/GlobalFetch)

## Install

[![build status](https://img.shields.io/travis/vlki/refresh-fetch/master.svg?style=flat-square)](https://travis-ci.org/vlki/refresh-fetch) [![npm version](https://img.shields.io/npm/v/refresh-fetch.svg?style=flat-square)](https://www.npmjs.com/package/refresh-fetch)

Add to your app using package manager:

```
yarn add refresh-fetch
```

```
npm install refresh-fetch --save
```

## Usage

```js
import { configureRefreshFetch } from 'refresh-fetch'

const refreshFetch = configureRefreshFetch({
  // Pass fetch function you want to wrap, it should already be adding
  // token to the request
  fetch,
  // shouldRefreshToken is called when API fetch fails and it should decide
  // whether the response error means we need to refresh token
  shouldRefreshToken: error => false,
  // refreshToken should call the refresh token API, save the refreshed
  // token and return promise -- resolving it when everything goes fine,
  // rejecting it when refreshing fails for some reason
  refreshToken: () => Promise.resolve()
})

// Use same as the original fetch
refreshFetch('/api-with-authentication', { method: 'POST' })
```

## Example

```js
// api.js
import merge from 'lodash/merge'
import Cookies from 'js-cookie'
import { configureRefreshFetch, fetchJSON } from 'refresh-fetch'

const COOKIE_NAME = 'MYAPP'

const retrieveToken = () => Cookies.get(COOKIE_NAME)
const saveToken = token => Cookies.set(COOKIE_NAME, token)
const clearToken = () => Cookies.remove(COOKIE_NAME)

const fetchJSONWithToken = (url, options = {}) => {
  const token = retrieveToken()

  let optionsWithToken = options
  if (token != null) {
    optionsWithToken = merge({}, options, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  }

  return fetchJSON(url, optionsWithToken)
}

const login = (email, password) => {
  return fetchJSON('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password
    })
  })
    .then(response => {
      saveToken(response.body.token)
    })
}

const logout = () => {
  return fetchJSONWithToken('/api/auth/logout', {
    method: 'POST'
  })
    .then(() => {
      clearToken()
    })
}

const shouldRefreshToken = error =>
  error.response.status === 401 &&
  error.body.message === 'Token has expired'

const refreshToken = () => {
  return fetchJSONWithToken('/api/auth/refresh-token', {
    method: 'POST'
  })
    .then(response => {
      saveToken(response.body.token)
    })
    .catch(error => {
      // Clear token and continue with the Promise catch chain
      clearToken()
      throw error
    })
}

const fetch = configureRefreshFetch({
  fetch: fetchJSONWithToken,
  shouldRefreshToken,
  refreshToken
})

export {
  fetch,
  login,
  logout
}
```

```js
// myapp.js

import { fetch, login, logout } from './api'

fetch('/api/user/me')
  .then(({ response, body }) => { /* Got the data! If token expired, it was renewed and saved. */ })
  .catch(error => { /* Error getting data, probably not logged in */ })

login('username', 'password')
  .then(() => { /* Logged in, token saved to cookie */ })
  .catch(error => { /* Error when logging in, probably wrong credentials */ })

logout()
  .then(() => { /* Logged out, token removed from cookie */ })
  .catch(error => { /* Error while logging out */ })

```

## Motivation

Imagine you have in your app a request to `/api/data` which needs authentication/authorization token in Authorization header like this:

```js
// retrieveToken reads the token from cookie, local storage, what have you...
const token = retrieveToken()

fetch('/api/data', {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
```

That is all fine and dandy, but what if you have to refresh the token, because it expires every 10 minutes? You will start doing something like this:

```js
// retrieveToken reads the token from cookie, local storage, what have you...
const token = retrieveToken()

fetch('/api/data', {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
  .then(response => {
    response.json().then(body => {
      if (response.status === 401 && body.message === 'Token has expired') {
        fetch('/api/refresh-token', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then(/* retrieve the token etc. ... */)
      }
    })
  })
```

And now you want to have the original request repeated. And also if there is request called during the refreshing, you don't want to start refreshing second time, but you just want to wait for the first refresh to complete and use the new token.

Sigh. That's a lot you don't want to be writing in every app.

With `refresh-fetch` you configure 3 parameters, `shouldRefreshToken`, `refreshToken` and `fetch`, and the refreshing works exactly like described. See it in action:

```js
// api.js

import merge from 'lodash/merge'

// fetchJSON is bundled wrapper around fetch which simplifies working
// with JSON API:
//   * Automatically adds Content-Type: application/json to request headers
//   * Parses response as JSON when Content-Type: application/json header is
//     present in response headers
//   * Converts non-ok responses to errors
import { configureRefreshFetch, fetchJSON } from 'refresh-fetch'

// Provide your favorite token saving -- to cookies, local storage, ...
const retrieveToken = () => { /* ... */ }
const saveToken = token => { /* ... */ }
const clearToken = () => { /* ... */ }

// Add token to the request headers
const fetchJSONWithToken = (url, options = {}) => {
  const token = retrieveToken()

  let optionsWithToken = options
  if (token != null) {
    optionsWithToken = merge({}, options, {
      headers: {
        Authorization: `Bearer ${retrieveToken()}`
      }
    })
  }

  return fetchJSON(url, optionsWithToken)
}

// Decide whether this error returned from API means that we want
// to try refreshing the token. error.response contains the fetch Response
// object, error.body contains the parsed JSON response body
const shouldRefreshToken = error =>
  error.response.status === 401
  && error.body.message === 'Token has expired'

// Do the actual token refreshing and update the saved token
const refreshToken = () => {
  return fetchJSONWithToken('/api/refresh-token', {
    method: 'POST'
  })
    .then(response => {
      saveToken(response.body.token)
      return response
    })
    .catch(error => {
      // If we failed by any reason in refreshing, just clear the token,
      // it's not that big of a deal
      clearToken()
      throw error
    })
}

export const fetch = configureRefreshFetch({
  shouldRefreshToken,
  refreshToken,
  fetch: fetchJSONWithToken,
})

```

```js
// myapp.js

import { fetch } from './api'

// This API will be called with Bearer token in Authorization header and if it
// returns 401 with message 'Token has expired', request to /api/refresh-token
// will be issued and then the request to /api/data will be automatically
// repeated with the new token
fetch('/api/data')
```

## License

[MIT](./LICENSE.md)
