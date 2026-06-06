import type { AmulProduct, ProductAvailability } from "@/types/amul";
import { SUBSTORES } from "../constants";
import { createAmulApi } from "./api";
import { AMUL_ERROR_CODE, AmulError } from "./error";

export const getSubstores = async () => {
  return SUBSTORES;
};

function toProductAvailability(
  product: AmulProduct,
  pincode: string,
  substoreAlias: string,
  substoreId: string
): ProductAvailability {
  const available =
    product.available === 1 &&
    (product.inventory_quantity === undefined ||
      product.inventory_quantity > 0 ||
      product.inventory_allow_out_of_stock === 1);

  return {
    pincode,
    substoreAlias,
    substoreId,
    productId: product._id,
    name: product.name,
    alias: product.alias,
    available,
    inventoryQuantity: product.inventory_quantity,
    inventoryAllowOutOfStock: product.inventory_allow_out_of_stock === 1,
    imageUrl: product.images?.[0]?.url,
    price: product.price,
    mrp: product.mrp,
    productUrl: `https://shop.amul.com/p/${product.alias}`,
    source: "amul",
  };
}

export type SearchResult =
  | { ok: true; results: ProductAvailability[] }
  | {
      ok: false;
      error: "PINCODE_NOT_FOUND" | "SUBSTORE_NOT_FOUND" | "FETCH_ERROR";
      message: string;
    };

export async function searchAmulProducts(
  pincode: string,
  query?: string
): Promise<SearchResult> {
  try {
    const api = await createAmulApi(pincode);
    const products = await api.getProteinProducts({ search: query });

    const substoreAlias = api.getSubstoreAlias();
    const substoreId = api.getSubstoreId();

    if (!substoreAlias || !substoreId) {
      return {
        ok: false,
        error: "SUBSTORE_NOT_FOUND",
        message: `Substore not found for pincode ${pincode}`,
      };
    }

    const results = products.map((p) =>
      toProductAvailability(p, pincode, substoreAlias, substoreId)
    );

    return { ok: true, results };
  } catch (err) {
    if (
      err instanceof AmulError &&
      err.code === AMUL_ERROR_CODE.PINCODE_NOT_FOUND
    ) {
      return { ok: false, error: "PINCODE_NOT_FOUND", message: err.message };
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: "FETCH_ERROR", message };
  }
}
