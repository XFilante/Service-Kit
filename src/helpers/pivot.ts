export const pivot = (
  tableName: string,
  options?: {
    pivotColumns?: string[]
    pivotTable?: string
    localKey?: string
    pivotForeignKey?: string
    relatedKey?: string
    pivotRelatedForeignKey?: string
    pivotTimestamps?:
      | boolean
      | {
          createdAt: string | boolean
          updatedAt: string | boolean
        }
    serializeAs?: string | null
    meta?: any
  }
) => ({
  pivotTable: tableName,
  pivotTimestamps: true,
  ...options,
})
