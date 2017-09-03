function configureRefreshFetch(configuration = {}) {
  const {
    refreshToken,
    shouldRefreshToken,
    fetch
  } = configuration

  let refreshingTokenPromise = null

  return (input, init) => {
    return fetch(input, init)
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
                  reject()
                })
            })
          }

          return refreshingTokenPromise
            .then(() => fetch(input, init))
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
