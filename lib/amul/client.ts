import type { AmulProduct, ProductAvailability } from "@/types/amul";
import { STORE_ID, SUBSTORES } from "../constants";
import { createAmulApi } from "./api";
import { AMUL_ERROR_CODE, AmulError } from "./error";

export const getSubstores = async () => {
  return SUBSTORES;
};

function deriveLabel(product: AmulProduct): ProductAvailability["label"] {
  const raw = String(
    product.metafields?.label ?? product.metafields?.badge ?? "",
  ).toLowerCase();
  if (raw === "new") return "new";
  if (raw.includes("bestseller") || raw.includes("best seller"))
    return "bestseller";
  if (raw === "trending") return "trending";
  return undefined;
}

function deriveDiscount(product: AmulProduct): number | undefined {
  const base = product.compare_price ?? product.original_price;
  if (!base || !product.price || base <= product.price) return undefined;
  return Math.round(((base - product.price) / base) * 100);
}

function toProductAvailability(
  product: AmulProduct,
  pincode: string,
  substoreAlias: string,
  substoreId: string,
): ProductAvailability {
  const available =
    product.available === 1 &&
    (product.inventory_quantity === undefined ||
      product.inventory_quantity > 0 ||
      product.inventory_allow_out_of_stock === 1);

  const thumbnail = product.images?.[0]?.image;

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
    imageUrl: thumbnail
      ? thumbnail.includes(`s/${STORE_ID}`)
        ? `https://shop.amul.com/${thumbnail}`
        : `https://shop.amul.com/s/${STORE_ID}/${thumbnail}`
      : undefined,
    price: product.price,
    mrp: product.compare_price ?? product.original_price,
    discount: deriveDiscount(product),
    label: deriveLabel(product),
    productUrl: `https://shop.amul.com/product/${product.alias}`,
    source: "amul",
  };
}

export type SearchResult =
  | { ok: true; results: ProductAvailability[]; total: number }
  | {
      ok: false;
      error: "PINCODE_NOT_FOUND" | "SUBSTORE_NOT_FOUND" | "FETCH_ERROR";
      message: string;
    };

const FETCH_ALL_LIMIT = 200;

export async function searchAmulProducts(
  pincode: string,
  query?: string,
  opts?: { category?: string; limit?: number; start?: number },
): Promise<SearchResult> {
  try {
    const api = await createAmulApi(pincode);

    const substoreAlias = api.getSubstoreAlias();
    const substoreId = api.getSubstoreId();

    if (!substoreAlias || !substoreId) {
      return {
        ok: false,
        error: "SUBSTORE_NOT_FOUND",
        message: `Substore not found for pincode ${pincode}`,
      };
    }

    const category = opts?.category ?? "protein";
    let products: AmulProduct[];
    let total: number;

    if (query) {
      // Fetch all products, filter, then paginate so that total and
      // page offsets reflect the filtered set rather than Amul's full count.
      const res = await api.getProducts({ category, limit: FETCH_ALL_LIMIT, start: 0 });
      const q = query.toLowerCase();
      const filtered = res.data.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.alias.toLowerCase().includes(q),
      );
      total = filtered.length;
      const start = opts?.start ?? 0;
      const limit = opts?.limit ?? 8;
      products = filtered.slice(start, start + limit);
    } else {
      const res = await api.getProducts({ category, limit: opts?.limit, start: opts?.start });
      products = res.data;
      total = res.total;
    }

    const results = products.map((p) =>
      toProductAvailability(p, pincode, substoreAlias, substoreId),
    );

    return { ok: true, results, total };
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
