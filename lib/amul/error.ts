import { isAxiosError } from "axios";

export enum AMUL_ERROR_CODE {
  PINCODE_NOT_FOUND = "PINCODE_NOT_FOUND",
}

export class AmulError extends Error {
  public code: AMUL_ERROR_CODE;
  constructor(message: string, code: AMUL_ERROR_CODE) {
    super(message);
    this.name = "AmulError";
    this.code = code;
  }
}

export const AMUL_RATE_LIMIT_MESSAGE =
  "Amul data API usage has been exceeded. Please try again later. Unfortunately there is no official api to track amul products availabilty.";

export function getAmulErrorMessage(err: unknown): string {
  if (isAxiosError(err) && err.response?.status === 403) {
    return AMUL_RATE_LIMIT_MESSAGE;
  }
  return err instanceof Error ? err.message : "Unknown error";
}
