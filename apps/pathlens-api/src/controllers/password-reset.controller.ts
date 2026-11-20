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
  message: "If an account exists, we sent sign-in instructions to your email.",
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
  const appUrl = process.env.FRONTEND_URL;

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
      subject: "Reset your Pathlens password",
      text: `Reset your Pathlens password here: ${resetUrl.toString()}\n\nThis link expires in 30 minutes and can only be used once.`,

      html: `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Reset your Pathlens password</title>
    </head>

    <body style="margin:0;padding:0;background:#111111;font-family:Arial,Helvetica,sans-serif;color:#f5f5f5;">
      <table
        role="presentation"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        style="background:#111111;"
      >
        <tr>
          <td align="center" style="padding:56px 20px;">

            <table
              role="presentation"
              width="100%"
              cellpadding="0"
              cellspacing="0"
              border="0"
              style="max-width:540px;"
            >
              <!-- Header -->
              <tr>
                <td style="padding:0 0 28px;">
                  <span style="font-size:23px;font-weight:700;letter-spacing:-0.7px;color:#f5f5f5;">
                    Pathlens<span style="color:#4acb94;">.</span>
                  </span>
                </td>
              </tr>

              <!-- Main content -->
              <tr>
                <td style="border:1px solid #303030;padding:40px 36px;background:#141414;">

                  <p style="margin:0 0 24px;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#4acb94;">
                    ACCOUNT / PASSWORD RESET
                  </p>

                  <h1 style="margin:0 0 18px;font-size:32px;font-weight:600;line-height:1.2;letter-spacing:-1px;color:#ffffff;">
                    Reset your password<span style="color:#4acb94;">.</span>
                  </h1>

                  <p style="margin:0 0 30px;font-size:14px;line-height:1.8;color:#a3a3a3;">
                    We received a request to reset your Pathlens password.
                    Use the button below to create a new password and regain
                    access to your workspace.
                  </p>

                  <!-- Action -->
                  <table
                    role="presentation"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                  >
                    <tr>
                      <td bgcolor="#4acb94" style="border-radius:7px;">
                        <a
                          href="${safeUrl}"
                          target="_blank"
                          style="display:inline-block;background:#4acb94;color:#101010;text-decoration:none;padding:13px 24px;border-radius:7px;font-size:13px;font-weight:600;"
                        >
                          Reset password
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Security -->
                  <table
                    role="presentation"
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                  >
                    <tr>
                      <td style="padding-top:36px;">
                        <div style="border-top:1px dashed #343434;"></div>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding-top:24px;">
                        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#e5e5e5;">
                          This link expires in 30 minutes.
                        </p>

                        <p style="margin:0;font-size:12px;line-height:1.8;color:#888888;">
                          This password reset link can only be used once.
                          If you didn't request this change, you can safely
                          ignore this email. Your password will remain unchanged.
                        </p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

              <!-- Fallback URL -->
              <tr>
                <td style="padding:28px 0 0;">
                  <p style="margin:0 0 10px;font-size:12px;line-height:1.7;color:#888888;">
                    If the button doesn't work, copy and paste this link
                    into your browser:
                  </p>

                  <p style="margin:0;font-size:12px;line-height:1.7;word-break:break-all;">
                    <a
                      href="${safeUrl}"
                      style="color:#4acb94;text-decoration:underline;"
                    >
                      ${safeUrl}
                    </a>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding-top:40px;">
                  <div style="border-top:1px solid #303030;"></div>

                  <table
                    role="presentation"
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                  >
                    <tr>
                      <td style="padding-top:20px;font-size:12px;font-weight:600;color:#f5f5f5;">
                        Pathlens
                      </td>

                      <td align="right" style="padding-top:20px;font-size:11px;color:#777777;">
                        Automated security email
                      </td>
                    </tr>
                  </table>

                  <p style="margin:14px 0 0;font-size:11px;line-height:1.7;color:#777777;">
                    You received this email because a password reset was
                    requested for your Pathlens account.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend returned HTTP ${response.status}.`);
  }
}

async function sendProviderSignInEmail(email: string, providers: string[]) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error(
      "RESEND_API_KEY and RESEND_FROM_EMAIL are required for password resets."
    );
  }

  const providerNames = providers.join(" or ");
  const loginUrl = new URL(
    "/login",
    process.env.WEB_APP_URL ?? "http://localhost:5173"
  ).toString();
  const introduction = `We received a request to reset the password for the Pathlens account associated with ${email}.`;
  const guidance = `Your account is linked to ${providerNames}, so please use the ${providerNames} sign-in option on Pathlens. If you need to reset your provider password, do so directly through ${providerNames} by following their password reset process.`;
  const disclaimer =
    "If you didn't request a password reset, you can safely ignore this email.";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Sign in to your Pathlens account",
      text: `${introduction}\n\n${guidance}\n\nSign in: ${loginUrl}\n\n${disclaimer}`,
      html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sign in to your Pathlens account</title>
  </head>
  <body style="margin:0;padding:40px 20px;background:#111111;font-family:Arial,Helvetica,sans-serif;color:#f5f5f5;">
    <div style="max-width:540px;margin:0 auto;">
      <p style="font-size:23px;font-weight:700;">Pathlens<span style="color:#4acb94;">.</span></p>
      <div style="border:1px solid #303030;padding:36px;background:#141414;">
        <h1 style="font-size:28px;">Sign in to your Pathlens account</h1>
        <p style="line-height:1.8;color:#a3a3a3;">${escapeHtml(introduction)}</p>
        <p style="line-height:1.8;color:#a3a3a3;">${escapeHtml(guidance)}</p>
        <p style="margin:28px 0;"><a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#4acb94;color:#101010;text-decoration:none;padding:13px 24px;border-radius:7px;font-weight:600;">Sign in to Pathlens</a></p>
        <p style="border-top:1px dashed #343434;padding-top:24px;font-size:12px;line-height:1.8;color:#888888;">${escapeHtml(disclaimer)}</p>
      </div>
    </div>
  </body>
</html>`,
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

    if (!user.password) {
      const providers = [
        ...(user.googleId ? ["Google"] : []),
        ...(user.githubId ? ["GitHub"] : []),
      ];

      if (providers.length > 0) {
        await sendProviderSignInEmail(email, providers);
      }

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
