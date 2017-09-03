# Refresh Fetch

Wrapper around [fetch](https://developer.mozilla.org/en-US/docs/Web/API/GlobalFetch) capable of graceful authentication token refreshing.

For situations when there is API which issues authentication tokens on login endpoint, API requires you to add the authentication token to all requests, those tokens must be refreshed every X minutes, and you just want to call `fetch` and be abstracted away from the refreshing.

The following ES6 functions are required:

* [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
* [fetch](https://developer.mozilla.org/en-US/docs/Web/API/GlobalFetch)

## Install

Add to your app using package manager:

```
yarn add refresh-fetch
```

```
npm install refresh-fetch --save
```

## Example

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

And now you want to have the original request repeated. And also if there is request called during the refreshing, you don't want to start refreshing second time, but just wait for the first refresh to complete and use the new token.

With `refresh-fetch` you configure at least 3 parameters, `shouldRefreshToken`, `refreshToken` and `fetch`, and the refreshing works exactly like described. See it in action:

```js
// api.js

import merge from 'lodash/merge'

// fetchJSON is bundled wrapper around fetch which simplifies working
// with JSON API:
//   * Automatically adds Content-Type: application/json to request headers
//   * Parses response as JSON when Content-Type: application/json header is
//     present in response headers
//   * Converts non-success responses (HTTP status code >= 300) to errors
import { configureRefreshFetch, fetchJSON } from 'refresh-fetch'

// Provide your favorite token saving -- to cookies, local storage, ...
const retrieveToken = () => { /* ... */ }
const saveToken = token => { /* ... */ }
const clearToken = () => { /* ... */ }

// Decide whether this error returned from API means that we want
// to try refreshing the token. error.response contains the fetch Response
// object, error.body contains the parsed JSON response body
const shouldRefreshToken = error =>
  error.response.status === 401
  && error.body.message === 'Token has expired'

// Do the actual token refreshing and update the saved token
const refreshToken = () => {
  return fetchJSON('/api/refresh-token', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${retrieveToken()}`
    }
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

// Add authentication header to the request, input and init
// are the constructor parameters of Request object in Fetch API
const fetchJSONWithToken = (input, init) => {
  const token = retrieveToken()
  let initWithToken = init

  if (token !== null && token !== undefined) {
    initWithToken = merge({}, init, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return fetchJSON(input, initWithToken)
}

export default configureRefreshFetch({
  shouldRefreshToken,
  refreshToken,
  fetch: fetchJSONWithToken,
})

```

```js
// myapp.js

import fetch from './api'

// This API will be called with Bearer token in Authorization header and if it
// returns 401 with message 'Token has expired', request to /api/refresh-token
// will be issued and then the request to /api/data will be automatically
// repeated with the new token
fetch('/api/data')
```


## License

[MIT](./LICENSE.md)
