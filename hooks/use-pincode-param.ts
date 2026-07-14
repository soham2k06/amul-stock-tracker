"use client";

import { useSearchParams } from "next/navigation";

export function usePincodeParam() {
  return useSearchParams().get("pincode") ?? "";
}

export function withPincode(path: string, pincode: string) {
  return pincode ? `${path}?pincode=${pincode}` : path;
}
