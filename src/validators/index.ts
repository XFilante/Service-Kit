import vine from '@vinejs/vine'

export const PageSchema = vine.number().range([1, 100000])

export const LimitSchema = vine.number().range([1, 100])

export const OrderDirSchema = vine.enum(['asc', 'desc'])

export const OrderSchema = <FIELDS extends readonly string[]>(...fields: FIELDS) => {
  return vine.object({
    by: vine.enum(fields),
    dir: OrderDirSchema.optional(),
  })
}

// ====================

export const EmailSchema = vine.string().email()

export const UsernameSchema = vine.string().minLength(1).maxLength(50).alphaNumeric({
  allowDashes: true,
  allowSpaces: false,
  allowUnderscores: false,
})

export const PasswordSchema = vine
  .string()
  .minLength(6)
  .maxLength(20)
  .regex(/[a-zA-Z0-9]/)

export const TextSchema = vine.string().minLength(1).maxLength(100)

export const PhoneSchema = vine.string().mobile()

export const DescriptionSchema = vine.string().minLength(1).maxLength(1000)

export const DescriptionSmallSchema = vine.string().minLength(1).maxLength(400)

export const KeySchema = vine
  .string()
  .regex(/^[a-z\-:]+$/)
  .minLength(1)
  .maxLength(50)

export const MetadataSchema = vine.record(vine.string().minLength(1).maxLength(1000))

export const SlugSchema = vine
  .string()
  .minLength(1)
  .maxLength(50)
  .regex(/^[a-z0-9\-]+$/)
  .transform((value) => value.toLowerCase())
