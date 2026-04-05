import { object, string, type InferType } from 'yup'

export const signInValidation = object({
	email: string().email('Invalid email').required('Field is required'),
	password: string()
		.min(8, 'Must be at least 8 characters')
		.required('Field is required'),
})

export type SchemaSignInValidation = InferType<typeof signInValidation>

export const signUpValidation = object({
	email: string().email('Invalid email').required('Field is required'),
	password: string()
		.min(8, 'Must be at least 8 characters')
		.required('Field is required'),
})

export type SchemaSignUpValidation = InferType<typeof signUpValidation>

export const forgotPasswordValidation = object({
	email: string().email('Invalid email').required('Field is required'),
})

export type SchemaForgotPasswordValidation = InferType<
	typeof forgotPasswordValidation
>

export const resetPasswordValidation = object({
	password: string()
		.min(8, 'Must be at least 8 characters')
		.required('Field is required'),
})

export type SchemaResetPasswordValidation = InferType<
	typeof resetPasswordValidation
>

export const inquiryValidation = object({
	name: string()
		.min(2, 'Must be at least 2 characters')
		.max(120, 'Must be 120 characters or less')
		.required('Field is required'),
	email: string().email('Invalid email').required('Field is required'),
	company: string().max(120, 'Must be 120 characters or less').nullable(),
	website: string().url('Must be a valid URL').nullable(),
	message: string()
		.min(20, 'Must be at least 20 characters')
		.max(4000, 'Must be 4000 characters or less')
		.required('Field is required'),
})

export type SchemaInquiryValidation = InferType<typeof inquiryValidation>
