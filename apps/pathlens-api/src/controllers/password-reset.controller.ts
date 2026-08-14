import { Request, Response } from "express";
import { z, ZodError } from "zod";

import {
  consumePasswordResetTokenModel,
  createPasswordResetTokenModel,
} from "../models/password-reset.model";
import { getUserByEmailModel } from "../models/users.model";

const passwordResetRequestSchema = z.object({
  email: z.email({
    message: "Please enter a valid email address.",
  }),
});

const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(1, "This reset link is invalid."),
    password: z
      .string({
        error: "Please enter a password.",
      })
      .min(6, "Password must be at least 6 characters."),
    confirmPassword: z
      .string({
        error: "Please confirm your password.",
      })
      .min(6, "Password must be at least 6 characters."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const genericRequestResponse = {
  success: true,
  message: "If an account exists, we sent a password reset link.",
};

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character
  );
}

async function sendPasswordResetEmail(email: string, token: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.WEB_APP_URL ?? "http://localhost:5173";

  if (!apiKey || !from) {
    throw new Error(
      "RESEND_API_KEY and RESEND_FROM_EMAIL are required for password resets."
    );
  }

  const resetUrl = new URL("/password-reset", appUrl);
  resetUrl.searchParams.set("token", token);

  const safeUrl = escapeHtml(resetUrl.toString());
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Reset your PathLens password",
      text: `Reset your PathLens password here: ${resetUrl.toString()}\n\nThis link expires in 30 minutes and can only be used once.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:560px">
          <p style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#64748b">PathLens account recovery</p>
          <h1 style="font-size:28px;line-height:1.2;margin:16px 0 8px">Reset your password</h1>
          <p>Use the button below to choose a new password for your PathLens workspace.</p>
          <p style="margin:28px 0"><a href="${safeUrl}" style="background:#172033;color:#fff;border-radius:8px;padding:12px 18px;text-decoration:none;display:inline-block">Choose a new password</a></p>
          <p style="font-size:13px;color:#64748b">This link expires in 30 minutes and can only be used once. If you did not request this email, you can safely ignore it.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend returned HTTP ${response.status}.`);
  }
}

export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const { email } = passwordResetRequestSchema.parse(req.body);
    const user = await getUserByEmailModel(email);

    if (!user) {
      return res.status(200).json(genericRequestResponse);
    }

    const { token } = await createPasswordResetTokenModel(user.id);
    await sendPasswordResetEmail(email, token);

    return res.status(200).json(genericRequestResponse);
  } catch (error) {
    console.error("Password reset request failed:", error);

    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0]?.message ?? "Validation failed",
      });
    }

    return res.status(503).json({
      success: false,
      message: "Password reset email is temporarily unavailable.",
    });
  }
}

export async function confirmPasswordReset(req: Request, res: Response) {
  try {
    const { token, password } = passwordResetConfirmSchema.parse(req.body);
    const updated = await consumePasswordResetTokenModel(token, password);

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "This reset link is invalid or has expired.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Your password has been updated.",
    });
  } catch (error) {
    console.error("Password reset confirmation failed:", error);

    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0]?.message ?? "Validation failed",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update your password.",
    });
  }
}
