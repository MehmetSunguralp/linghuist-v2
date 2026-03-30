import * as Yup from 'yup';

import { enStrings } from '@/config/en.strings';
const authStrings = enStrings.auth;

/** Mirrors `LoginDto`: `@IsEmail()`, `@IsString()` on password (non-empty for UX). */
export const loginValidationSchema = Yup.object({
  email: Yup.string()
    .trim()
    .required(authStrings.validationEmailInvalid)
    .email(authStrings.validationEmailInvalid),
  password: Yup.string().required(authStrings.validationPasswordRequired),
});

/** Mirrors `SignupDto`: email, `@MinLength(8)` + `@Matches(/^(?=.*[A-Z])(?=.*[\W_])/)`, confirmPassword. */
export const signupValidationSchema = Yup.object({
  email: Yup.string()
    .trim()
    .required(authStrings.validationEmailInvalid)
    .email(authStrings.validationEmailInvalid),
  password: Yup.string()
    .required(authStrings.validationPasswordRequired)
    .min(8, authStrings.validationPasswordSignup)
    .matches(/^(?=.*[A-Z])(?=.*[\W_])/, authStrings.validationPasswordSignup),
  confirmPassword: Yup.string()
    .required(authStrings.validationConfirmPasswordRequired)
    .oneOf([Yup.ref('password')], authStrings.validationConfirmPasswordMatch),
});

/** Mirrors `RequestPasswordResetDto`: `@IsEmail()`. */
export const requestPasswordResetValidationSchema = Yup.object({
  email: Yup.string()
    .trim()
    .required(authStrings.validationEmailInvalid)
    .email(authStrings.validationEmailInvalid),
});
