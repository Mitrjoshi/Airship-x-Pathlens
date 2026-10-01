import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  createUserModel,
  getUserByEmailModel,
  getUserByGithubIdModel,
  linkGithubAccountModel,
} from "../models/users.model";
import { createDefaultWorkspaceModel } from "../models/workshop.model";
import { signJwt } from "../lib/jwt";

type GithubProfile = {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
};

type GithubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function getFrontendUrl() {
  return getRequiredEnv("FRONTEND_URL").replace(/\/$/, "");
}

function getGithubCallbackUrl(req: Request) {
  return (
    process.env.GITHUB_CALLBACK_URL ??
    `${req.protocol}://${req.get("host")}/api/auth/github/callback`
  );
}

function getGithubStateSecret() {
  return getRequiredEnv("JWT_SECRET");
}

function getGithubState(state: string) {
  const payload = jwt.verify(state, getGithubStateSecret()) as {
    value: string;
    purpose: string;
  };

  if (payload.purpose !== "github-oauth") {
    throw new Error("Invalid GitHub OAuth state.");
  }

  return payload;
}

function createGithubState(value: string) {
  return jwt.sign({ value, purpose: "github-oauth" }, getGithubStateSecret(), {
    expiresIn: "10m",
  });
}

function redirectWithError(
  res: Response,
  state: string | undefined,
  message: string
) {
  const url = new URL(`${getFrontendUrl()}/github-callback`);
  url.searchParams.set("error", message);
  if (state) url.searchParams.set("state", state);
  return res.redirect(url.toString());
}

export function githubLogin(req: Request, res: Response) {
  try {
    const clientId = getRequiredEnv("GITHUB_CLIENT_ID");
    const callbackUrl = getGithubCallbackUrl(req);
    const stateValue =
      typeof req.query.state === "string" ? req.query.state : "";

    if (!stateValue) {
      return res.status(400).json({
        success: false,
        message: "OAuth state is required.",
      });
    }

    const state = createGithubState(stateValue);
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", callbackUrl);
    url.searchParams.set("scope", "read:user user:email");
    url.searchParams.set("state", state);

    return res.redirect(url.toString());
  } catch (error) {
    console.error("GitHub OAuth initialization failed:", error);
    return res.status(503).json({
      success: false,
      message: "GitHub login is not configured.",
    });
  }
}

async function exchangeGithubCode(code: string, callbackUrl: string) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: getRequiredEnv("GITHUB_CLIENT_ID"),
      client_secret: getRequiredEnv("GITHUB_CLIENT_SECRET"),
      code,
      redirect_uri: callbackUrl,
    }),
  });

  if (!response.ok) throw new Error("GitHub token exchange failed.");

  const data = (await response.json()) as {
    access_token?: string;
    error?: string;
  };

  if (!data.access_token) {
    throw new Error(data.error ?? "GitHub did not return an access token.");
  }

  return data.access_token;
}

async function getGithubUser(accessToken: string) {
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${accessToken}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const [profileResponse, emailsResponse] = await Promise.all([
    fetch("https://api.github.com/user", { headers }),
    fetch("https://api.github.com/user/emails", { headers }),
  ]);

  if (!profileResponse.ok || !emailsResponse.ok) {
    throw new Error("Unable to read the GitHub profile.");
  }

  return {
    profile: (await profileResponse.json()) as GithubProfile,
    emails: (await emailsResponse.json()) as GithubEmail[],
  };
}

export async function githubCallback(req: Request, res: Response) {
  const returnedState =
    typeof req.query.state === "string" ? req.query.state : undefined;

  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = returnedState ? getGithubState(returnedState) : null;

    if (!code || !state?.value) {
      return redirectWithError(
        res,
        state?.value,
        "GitHub login was cancelled."
      );
    }

    const accessToken = await exchangeGithubCode(
      code,
      getGithubCallbackUrl(req)
    );
    const { profile, emails } = await getGithubUser(accessToken);
    const verifiedEmail =
      emails.find((email) => email.primary && email.verified) ??
      emails.find((email) => email.verified);

    if (!verifiedEmail?.email) {
      return redirectWithError(
        res,
        state.value,
        "Your GitHub account must have a verified email address."
      );
    }

    const githubId = String(profile.id);
    let user = await getUserByGithubIdModel(githubId);

    if (!user) {
      user = await getUserByEmailModel(verifiedEmail.email);
    }

    if (user) {
      if (user.githubId !== githubId || user.avatar !== profile.avatar_url) {
        await linkGithubAccountModel({
          id: user.id,
          githubId,
          avatar: profile.avatar_url,
        });
      }
    } else {
      const [createdUser] = await createUserModel({
        email: verifiedEmail.email,
        name: profile.name?.trim() || profile.login,
        password: null,
        avatar: profile.avatar_url,
        githubId,
      });
      user = await getUserByGithubIdModel(githubId);

      if (!user || user.id !== createdUser.id) {
        throw new Error("Unable to create the GitHub user.");
      }

      await createDefaultWorkspaceModel({ user_id: user.id });
    }

    const token = signJwt({ id: user.id, email: user.email });
    const redirectUrl = new URL(`${getFrontendUrl()}/github-callback`);
    redirectUrl.searchParams.set("state", state.value);
    redirectUrl.hash = new URLSearchParams({ token }).toString();

    return res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("GitHub OAuth callback failed:", error);
    return redirectWithError(
      res,
      returnedState,
      "Unable to sign in with GitHub. Please try again."
    );
  }
}
