export const promiseMap = <T, U>(array: T[], callback: (item: T) => Promise<U>) => {
  return Promise.all(array.map(callback))
}
