# Refresh Fetch

Wrapper around [fetch](https://developer.mozilla.org/en-US/docs/Web/API/GlobalFetch) capable of graceful authentication token refreshing.

For situations when there is API which issues authentication tokens on login endpoint, API requires you to add the authentication token to all requests, those tokens must be refreshed every X minutes, and you just want to call `fetch` and be abstracted away from the refreshing.

The following ES6 functions are required:

* [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
* [fetch](https://developer.mozilla.org/en-US/docs/Web/API/GlobalFetch)

## Install

Use your favorite package manager:

```
yarn add refresh-fetch
```

```
npm install refresh-fetch --save
```

## Example

```js
// api.js

import merge from 'lodash/merge'
import { configureRefreshFetch, fetchJSON } from 'refresh-fetch'

// Provide your favorite token saving -- to cookies, local storage, ...
const retrieveToken = () => { /* ... */ }
const saveToken = token => { /* ... */ }
const clearToken = () => { /* ... */ }

const shouldRefreshToken = error =>
  error.response.status === 401
  && error.body.message === 'Token has expired'

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

export default fetch

```

```js
// myapp.js

import fetch from './api'

// This API will be called with Bearer token in Authorization header and
// if it returns 401 with message 'Token has expired', request to
// /api/refresh-token will be issued and then the request to /api/data
// will be automatically repeated with the new token
fetch('/api/data')
```


## License

[MIT](./LICENSE.md)
