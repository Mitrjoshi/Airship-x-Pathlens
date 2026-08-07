import { NextFunction, Request, Response } from "express";
import xss from "xss"; // npm install xss

function hasDangerousHTML(str: string) {
  return xss(str) !== str;
}

function containsDangerousHTML(value: any): boolean {
  if (typeof value === "string") {
    return hasDangerousHTML(decodeURIComponent(value));
  } else if (value && typeof value === "object") {
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        if (containsDangerousHTML(value[key])) {
          return true;
        }
      }
    }
  }
  return false;
}

export const handleHTMLInjection = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (
    (req.body && containsDangerousHTML(req.body)) ||
    (req.query && containsDangerousHTML(req.query)) ||
    (req.params && containsDangerousHTML(req.params))
  ) {
    res.status(400).json({
      message: "Dangerous HTML detected. Request blocked.",
      success: false,
    });
    return;
  }
  next();
};
