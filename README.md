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

TODO

## License

[MIT](./LICENSE.md)
