import { Request, Response } from "express";
import { z, ZodError } from "zod";
import {
  createUserModel,
  deleteUserModel,
  getUserByEmailModel,
  getUserByIDModel,
  updateUserModel,
  updateUserPasswordModel,
} from "../models/users.model";
import { AuthRequest, signJwt } from "../lib/jwt";
import {
  createDefaultWorkspaceModel,
  getDefaultWorkspace,
  getWorkspaces,
} from "../models/workshop.model";

const loginSchema = z.object({
  email: z.email({
    message: "Please enter a valid email address.",
  }),
  password: z
    .string({
      error: "Please enter your password.",
    })
    .min(6, "Password must be at least 6 characters."),
});

export async function loginUser(req: Request, res: Response) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await getUserByEmailModel(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Replace this with bcrypt.compare() if passwords are hashed
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = signJwt({
      id: user.id,
      email: user.email,
    });

    const workspace = await getDefaultWorkspace(user.id);

    return res.status(200).json({
      success: true,
      data: {
        token,
        workspace_id: workspace.id,
      },
    });
  } catch (error) {
    console.error(error);

    let errorMessage = "Something went wrong";

    if (error instanceof ZodError) {
      errorMessage = error.issues[0]?.message ?? "Validation failed";
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res.status(400).json({
      success: false,
      message: errorMessage,
    });
  }
}

const signUpSchema = z.object({
  email: z.email({
    message: "Please enter a valid email address.",
  }),
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
  name: z.string({
    error: "Please enter your name.",
  }),
});

const updateUserSchema = z.object({
  name: z
    .string({ error: "Please enter your name." })
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(120, "Name must be 120 characters or less."),
  email: z.email({ message: "Please enter a valid email address." }),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const deleteUserSchema = z.object({
  password: z.string().min(1, "Your current password is required."),
});

function hasDatabaseErrorCode(error: unknown, code: string): boolean {
  let current: unknown = error;

  while (current && typeof current === "object") {
    if ("code" in current && current.code === code) return true;

    current = "cause" in current ? current.cause : null;
  }

  return false;
}

export async function createUser(req: Request, res: Response) {
  try {
    const { email, name, password, confirmPassword } = signUpSchema.parse(
      req.body
    );

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    const existingUser = await getUserByEmailModel(email);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please log in.",
      });
    }

    const userResult = await createUserModel({
      email,
      name,
      password,
    });

    const userId = userResult[0].id;

    const token = signJwt({
      email,
      id: userId,
    });

    const workspaceResult = await createDefaultWorkspaceModel({
      user_id: userId,
    });
    const workspaceId = workspaceResult[0].id;

    res.status(200).json({
      success: true,
      data: {
        token,
        workspace_id: workspaceId,
      },
    });
  } catch (error) {
    console.error(error);

    const isDuplicateEmail = hasDatabaseErrorCode(error, "23505");
    let errorMessage = "Something went wrong";

    if (isDuplicateEmail) {
      errorMessage =
        "An account with this email already exists. Please log in.";
    } else if (error instanceof ZodError) {
      errorMessage = error.issues[0]?.message ?? "Validation failed";
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res.status(isDuplicateEmail ? 409 : 400).json({
      success: false,
      message: errorMessage,
    });
  }
}

export async function getUser(req: AuthRequest, res: Response) {
  try {
    const userData = await getUserByIDModel(req.user?.id!);

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).send({
      success: true,
      data: {
        ...userData,
        password: undefined,
      },
    });
  } catch (error) {
    console.error(error);

    let errorMessage = "Something went wrong";

    if (error instanceof ZodError) {
      errorMessage = error.issues[0]?.message ?? "Validation failed";
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res.status(400).json({
      success: false,
      message: errorMessage,
    });
  }
}

export async function updateUser(req: AuthRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { name, email } = updateUserSchema.parse(req.body);
    const existingUser = await getUserByEmailModel(email);

    if (existingUser && existingUser.id !== userId) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const updatedUser = await updateUserModel({
      id: userId,
      name,
      email,
    });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const userData = await getUserByIDModel(userId);

    return res.status(200).json({
      success: true,
      data: {
        ...userData,
        password: undefined,
      },
    });
  } catch (error) {
    console.error(error);

    const isDuplicateEmail = hasDatabaseErrorCode(error, "23505");
    let errorMessage = "Something went wrong";

    if (isDuplicateEmail) {
      errorMessage = "An account with this email already exists.";
    } else if (error instanceof ZodError) {
      errorMessage = error.issues[0]?.message ?? "Validation failed";
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res.status(isDuplicateEmail ? 409 : 400).json({
      success: false,
      message: errorMessage,
    });
  }
}

export async function changePassword(req: AuthRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(
      req.body
    );
    const userData = await getUserByIDModel(userId);

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (userData.password !== currentPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    await updateUserPasswordModel({
      id: userId,
      password: newPassword,
    });

    return res.status(200).json({
      success: true,
      message: "Your password has been updated.",
    });
  } catch (error) {
    console.error(error);

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message:
        error instanceof ZodError
          ? (error.issues[0]?.message ?? "Validation failed")
          : "Unable to update your password.",
    });
  }
}

export async function deleteUser(req: AuthRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { password } = deleteUserSchema.parse(req.body);
    const userData = await getUserByIDModel(userId);

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (userData.password !== password) {
      return res.status(400).json({
        success: false,
        message: "Password is incorrect.",
      });
    }

    const deletedUser = await deleteUserModel(userId);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Your account has been deleted.",
    });
  } catch (error) {
    console.error(error);

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message:
        error instanceof ZodError
          ? (error.issues[0]?.message ?? "Validation failed")
          : "Unable to delete your account.",
    });
  }
}

export async function getUserWorkspaces(req: AuthRequest, res: Response) {
  try {
    const workspaces = await getWorkspaces(req.user?.id!);

    return res.status(200).json({
      success: true,
      data: workspaces,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to load workspaces.",
    });
  }
}
