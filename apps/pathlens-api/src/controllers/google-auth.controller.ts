import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  createUserModel,
  getUserByEmailModel,
  getUserByGoogleIdModel,
  linkGoogleAccountModel,
} from "../models/users.model";
import { createDefaultWorkspaceModel } from "../models/workshop.model";
import { signJwt } from "../lib/jwt";

type GoogleProfile = {
  sub: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function getFrontendUrl() {
  return getRequiredEnv("FRONTEND_URL").replace(/\/$/, "");
}

function getGoogleCallbackUrl(req: Request) {
  return (
    process.env.GOOGLE_CALLBACK_URL ??
    `${req.protocol}://${req.get("host")}/api/auth/google/callback`
  );
}

function getGoogleState(state: string) {
  const payload = jwt.verify(state, getRequiredEnv("JWT_SECRET")) as {
    value: string;
    purpose: string;
  };

  if (payload.purpose !== "google-oauth") {
    throw new Error("Invalid Google OAuth state.");
  }

  return payload;
}

function createGoogleState(value: string) {
  return jwt.sign(
    { value, purpose: "google-oauth" },
    getRequiredEnv("JWT_SECRET"),
    { expiresIn: "10m" }
  );
}

function redirectWithError(
  res: Response,
  state: string | undefined,
  message: string
) {
  const url = new URL(`${getFrontendUrl()}/google-callback`);
  url.searchParams.set("error", message);
  if (state) url.searchParams.set("state", state);
  return res.redirect(url.toString());
}

export function googleLogin(req: Request, res: Response) {
  try {
    const stateValue =
      typeof req.query.state === "string" ? req.query.state : "";

    if (!stateValue) {
      return res.status(400).json({
        success: false,
        message: "OAuth state is required.",
      });
    }

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", getRequiredEnv("GOOGLE_AUTH_CLIENT_ID"));
    url.searchParams.set("redirect_uri", getGoogleCallbackUrl(req));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", createGoogleState(stateValue));
    url.searchParams.set("access_type", "online");

    return res.redirect(url.toString());
  } catch (error) {
    console.error("Google OAuth initialization failed:", error);
    return res.status(503).json({
      success: false,
      message: "Google login is not configured.",
    });
  }
}

async function exchangeGoogleCode(code: string, redirectUri: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getRequiredEnv("GOOGLE_AUTH_CLIENT_ID"),
      client_secret: getRequiredEnv("GOOGLE_AUTH_CLIENT_SECRET"),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) throw new Error("Google token exchange failed.");

  const data = (await response.json()) as {
    access_token?: string;
  };

  if (!data.access_token) {
    throw new Error("Google did not return an access token.");
  }

  return data.access_token;
}

async function getGoogleUser(accessToken: string) {
  const response = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) throw new Error("Unable to read the Google profile.");
  return (await response.json()) as GoogleProfile;
}

export async function googleCallback(req: Request, res: Response) {
  const returnedState =
    typeof req.query.state === "string" ? req.query.state : undefined;

  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = returnedState ? getGoogleState(returnedState) : null;

    if (!code || !state?.value) {
      return redirectWithError(
        res,
        state?.value,
        "Google login was cancelled."
      );
    }

    const accessToken = await exchangeGoogleCode(
      code,
      getGoogleCallbackUrl(req)
    );
    const profile = await getGoogleUser(accessToken);

    if (!profile.sub || !profile.email || !profile.email_verified) {
      return redirectWithError(
        res,
        state.value,
        "Your Google account must have a verified email address."
      );
    }

    let user = await getUserByGoogleIdModel(profile.sub);

    if (!user) {
      user = await getUserByEmailModel(profile.email);
    }

    if (user) {
      if (user.googleId !== profile.sub || user.avatar !== profile.picture) {
        await linkGoogleAccountModel({
          id: user.id,
          googleId: profile.sub,
          avatar: profile.picture,
        });
      }
    } else {
      const [createdUser] = await createUserModel({
        email: profile.email,
        name: profile.name?.trim() || profile.email.split("@")[0],
        password: null,
        avatar: profile.picture,
        googleId: profile.sub,
      });
      user = await getUserByGoogleIdModel(profile.sub);

      if (!user || user.id !== createdUser.id) {
        throw new Error("Unable to create the Google user.");
      }

      await createDefaultWorkspaceModel({ user_id: user.id });
    }

    const token = signJwt({ id: user.id, email: user.email });
    const redirectUrl = new URL(`${getFrontendUrl()}/google-callback`);
    redirectUrl.searchParams.set("state", state.value);
    redirectUrl.hash = new URLSearchParams({ token }).toString();

    return res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    return redirectWithError(
      res,
      returnedState,
      "Unable to sign in with Google. Please try again."
    );
  }
}
