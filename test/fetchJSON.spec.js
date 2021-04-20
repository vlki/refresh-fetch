/* eslint-env jest */

beforeEach(() => {
  const mockFetch = jest.fn()
  Object.defineProperty(global, 'fetch', { value: mockFetch, writable: true })
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('fetchJSON', () => {
  it('should call fetch with no additional headers without a body', (done) => {
    import('../src').then(({ fetchJSON }) => {
      // Mock the Response
      const mockText = jest.fn().mockReturnValueOnce(Promise.resolve(''))
      const mockClone = jest.fn().mockImplementation(() => {
        return {
          text: mockText
        }
      })
      global.fetch.mockReturnValueOnce(Promise.resolve({
        clone: mockClone,
        headers: new Headers()
      }))

      const url = '/1'
      const options = {}
      fetchJSON(url, options)
      expect(global.fetch).toBeCalledWith(url, options)
      done()
    })
  })

  it('should call fetch with a default Content-Type header with a body', (done) => {
    import('../src').then(({ fetchJSON }) => {
      // Mock the Response
      const mockText = jest.fn().mockReturnValueOnce(Promise.resolve(''))
      const mockClone = jest.fn().mockImplementation(() => {
        return {
          text: mockText
        }
      })
      global.fetch.mockReturnValueOnce(Promise.resolve({
        clone: mockClone,
        headers: new Headers()
      }))

      const url = '/2'
      const options = {
        body: JSON.stringify({}),
        method: 'POST'
      }
      fetchJSON(url, options)
      expect(global.fetch).toBeCalledWith(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json'
        }
      })
      done()
    })
  })
})
