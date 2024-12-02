export const pivot = (
  tableName: string,
  options?: {
    columns?: string[]
  }
) => ({
  pivotTable: tableName,
  pivotTimestamps: true,
  pivotColumns: options?.columns,
})
