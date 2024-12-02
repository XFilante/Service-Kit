export const EnumKey = <ENUM extends Record<any, string | number>>(
  _enumObject: ENUM,
  key: keyof ENUM
) => {
  return key
}
