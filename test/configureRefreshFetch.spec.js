/* eslint-env jest */

import { configureRefreshFetch } from '../src'

describe('configureRefreshFetch', () => {
  it('should call passed fetch with same params', () => {
    const fetchMock = jest.fn(() => Promise.resolve())

    const fetch = configureRefreshFetch({
      shouldRefreshToken: () => false,
      refreshToken: () => {},
      fetch: fetchMock
    })

    fetch('/foo', { method: 'POST' })

    expect(fetchMock.mock.calls).toEqual([['/foo', { method: 'POST' }]])
  })

  it('should reject with reason when request fails and not refreshing', done => {
    const fetchMock = jest.fn(() => Promise.reject(new Error('I am reason')))

    const fetch = configureRefreshFetch({
      shouldRefreshToken: () => false,
      refreshToken: () => {},
      fetch: fetchMock
    })

    fetch('/foo', { method: 'POST' }).catch(error => {
      expect(error.message).toBe('I am reason')
      done()
    })
  })

  it('should call shouldRefreshToken with reason if fetch is rejected', done => {
    const reason = new Error('I am reason')
    const fetchMock = jest.fn(() => Promise.reject(reason))
    const shouldRefreshTokenSpy = jest.fn(() => false)

    const fetch = configureRefreshFetch({
      shouldRefreshToken: shouldRefreshTokenSpy,
      refreshToken: () => {},
      fetch: fetchMock
    })

    fetch('/foo', { method: 'POST' }).catch(() => {
      expect(shouldRefreshTokenSpy.mock.calls).toEqual([[reason]])
      done()
    })
  })

  it('should call refreshToken when request fails and shouldRefreshToken returns true', done => {
    const fetchMock = jest.fn(() => Promise.reject(new Error('I am reason')))
    const refreshTokenSpy = jest.fn(() => Promise.reject(new Error()))

    const fetch = configureRefreshFetch({
      shouldRefreshToken: () => true,
      refreshToken: refreshTokenSpy,
      fetch: fetchMock
    })

    fetch('/foo', { method: 'POST' }).catch(() => {
      expect(refreshTokenSpy.mock.calls).toEqual([[]])
      done()
    })
  })

  it('should reject with original reason when request as well as refreshToken fails', done => {
    const fetchMock = jest.fn(() => Promise.reject(new Error('I am reason')))
    const refreshTokenMock = jest.fn(() =>
      Promise.reject(new Error('Other reason'))
    )

    const fetch = configureRefreshFetch({
      shouldRefreshToken: () => true,
      refreshToken: refreshTokenMock,
      fetch: fetchMock
    })

    fetch('/foo', { method: 'POST' }).catch(error => {
      expect(error.message).toEqual('I am reason')
      done()
    })
  })

  it('should repeat call to fetch with same params after successful token refresh', done => {
    const fetchMock = jest
      .fn()
      .mockReturnValueOnce(Promise.reject(new Error('Token has expired')))
      .mockReturnValueOnce(Promise.resolve('Some data'))

    const refreshTokenMock = jest.fn(() => Promise.resolve('New token'))

    const fetch = configureRefreshFetch({
      shouldRefreshToken: () => true,
      refreshToken: refreshTokenMock,
      fetch: fetchMock
    })

    fetch('/foo', { method: 'POST' }).then(() => {
      expect(fetchMock.mock.calls).toEqual([
        ['/foo', { method: 'POST' }],
        ['/foo', { method: 'POST' }]
      ])
      done()
    })
  })

  it('should resolve with result of repeated fetch call', done => {
    const fetchMock = jest
      .fn()
      .mockReturnValueOnce(Promise.reject(new Error('Token has expired')))
      .mockReturnValueOnce(Promise.resolve('Some data'))

    const refreshTokenMock = jest.fn(() => Promise.resolve('New token'))

    const fetch = configureRefreshFetch({
      shouldRefreshToken: () => true,
      refreshToken: refreshTokenMock,
      fetch: fetchMock
    })

    fetch('/foo', { method: 'POST' }).then(data => {
      expect(data).toBe('Some data')
      done()
    })
  })

  it('should not call refreshToken second time when already refreshing', done => {
    const fetchMock = jest
      .fn()
      .mockReturnValueOnce(Promise.reject(new Error('Token has expired')))
      .mockReturnValueOnce(Promise.reject(new Error('Token has expired')))
      .mockReturnValueOnce(Promise.resolve('Some data'))
      .mockReturnValueOnce(Promise.resolve('Some data'))

    let refreshTokenPromiseResolve
    const refreshTokenMock = jest.fn(
      () =>
        new Promise(resolve => {
          refreshTokenPromiseResolve = resolve
        })
    )

    const fetch = configureRefreshFetch({
      shouldRefreshToken: () => true,
      refreshToken: refreshTokenMock,
      fetch: fetchMock
    })

    const fetch1 = fetch('/foo', { method: 'POST' })
    const fetch2 = fetch('/bar', { method: 'POST' })

    process.nextTick(() => refreshTokenPromiseResolve())

    Promise.all([fetch1, fetch2]).then(() => {
      expect(refreshTokenMock.mock.calls).toEqual([[]])
      done()
    })
  })

  it('should not fetch when token refreshing is in progress', done => {
    const fetchMock = jest
      .fn()
      .mockReturnValue(Promise.reject(new Error('Token has expired')))

    const refreshTokenMock = jest.fn(() => new Promise(() => {}))

    const fetch = configureRefreshFetch({
      shouldRefreshToken: () => true,
      refreshToken: refreshTokenMock,
      fetch: fetchMock
    })

    fetch('/foo', { method: 'POST' })

    process.nextTick(() => {
      fetch('/bar', { method: 'POST' })

      expect(fetchMock.mock.calls).toEqual([['/foo', { method: 'POST' }]])
      done()
    })
  })

  it('should wait with all fetches for completed token refresh', done => {
    const fetchMock = jest
      .fn()
      .mockReturnValueOnce(Promise.reject(new Error('Token has expired')))
      .mockReturnValueOnce(Promise.reject(new Error('Token has expired')))

    let refreshTokenPromiseResolve
    const refreshTokenMock = jest.fn(
      () =>
        new Promise(resolve => {
          refreshTokenPromiseResolve = resolve
        })
    )

    const fetch = configureRefreshFetch({
      shouldRefreshToken: () => true,
      refreshToken: refreshTokenMock,
      fetch: fetchMock
    })

    const fetch1 = fetch('/foo', { method: 'POST' })
    const fetch2 = fetch('/bar', { method: 'POST' })

    process.nextTick(() => {
      fetchMock
        .mockReturnValueOnce(Promise.resolve('Some data'))
        .mockReturnValueOnce(Promise.resolve('Some data'))

      refreshTokenPromiseResolve()

      Promise.all([fetch1, fetch2]).then(([data1, data2]) => {
        expect(data1).toBe('Some data')
        expect(data2).toBe('Some data')
        done()
      })
    })
  })

  it('should reject after successful token refresh and errorneous response with that response', done => {
    const fetchMock = jest
      .fn()
      .mockReturnValueOnce(Promise.reject(new Error('Token has expired')))
      .mockReturnValueOnce(Promise.reject(new Error('Server error')))

    const refreshTokenMock = jest.fn(() => Promise.resolve('New token'))

    const fetch = configureRefreshFetch({
      shouldRefreshToken: error => error.message === 'Token has expired',
      refreshToken: refreshTokenMock,
      fetch: fetchMock
    })

    fetch('/foo', { method: 'POST' }).catch(error => {
      expect(error.message).toEqual('Server error')
      done()
    })
  })
})
