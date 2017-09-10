// @flow

type Configuration = {
  refreshToken: () => Promise<void>,
  shouldRefreshToken: (error: any) => boolean,
  fetch: (url: any, options: Object) => Promise<any>
}

function configureRefreshFetch (configuration: Configuration) {
  const {
    refreshToken,
    shouldRefreshToken,
    fetch
  } = configuration

  let refreshingTokenPromise = null

  return (url: any, options: Object) => {
    return fetch(url, options)
      .catch(error => {
        if (shouldRefreshToken(error)) {
          if (refreshingTokenPromise === null) {
            refreshingTokenPromise = new Promise((resolve, reject) => {
              refreshToken()
                .then(() => {
                  refreshingTokenPromise = null
                  resolve()
                })
                .catch(refreshTokenError => {
                  refreshingTokenPromise = null
                  reject(refreshTokenError)
                })
            })
          }

          return refreshingTokenPromise
            .then(() => fetch(url, options))
            .catch(() => {
              // If refreshing fails, continue with original error
              throw error
            })
        } else {
          throw error
        }
      })
  }
}

export default configureRefreshFetch
