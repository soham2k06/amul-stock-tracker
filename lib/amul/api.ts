import { STORE_ID, SUBSTORES } from "@/lib/constants";
import type {
  AmulCoupon,
  AmulCouponsResponse,
  AmulPincodeResponse,
  AmulProduct,
  AmulProductsResponse,
  AmulSessionInfo,
  PincodeRecord,
} from "@/types/amul";
import axios, { type AxiosInstance } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar, parse as parseCookie } from "tough-cookie";
import { AMUL_ERROR_CODE, AmulError } from "./error";

export const defaultHeaders = {
  accept: "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  base_url: "https://shop.amul.com/en/browse/protein",
  "cache-control": "no-cache",
  frontend: "1",
  pragma: "no-cache",
  priority: "u=1, i",
  referer: "https://shop.amul.com/",
  "sec-ch-ua":
    '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Linux"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "sec-gpc": "1",
  "user-agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
};

const productFields = [
  "name",
  "brand",
  "categories",
  "collections",
  "alias",
  "sku",
  "price",
  "compare_price",
  "original_price",
  "images",
  "metafields",
  "discounts",
  "catalog_only",
  "is_catalog",
  "seller",
  "available",
  "inventory_quantity",
  "net_quantity",
  "num_reviews",
  "avg_rating",
  "inventory_low_stock_quantity",
  "inventory_allow_out_of_stock",
  "default_variant",
  "variants",
  "lp_seller_ids",
];

export const substoreSessions: Map<string, AmulApi> = new Map();
let defaultSession: AmulApi | null = null;

export class AmulApi {
  private pincodeRecord: PincodeRecord | undefined;
  public amulApi: AxiosInstance;
  private tid: string | undefined;
  private jar: CookieJar;
  private storeVersion: string | number = 0;

  constructor() {
    this.jar = new CookieJar();
    const instance = axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: defaultHeaders,
    });
    this.amulApi = wrapper(instance);
  }

  private async ensureStoreVersion() {
    if (this.storeVersion) return;
    try {
      const response = await this.amulApi.get<string>(
        "https://shop.amul.com/ms/store/amul/auto/EN/storeinfo.js",
      );
      const match = response.data.match(
        /req\.query\.v\s*=\s*['"]?([^'";\s]+)['"]?/,
      );
      this.storeVersion = match?.[1] ?? 4;
    } catch {
      this.storeVersion = 4;
    }
  }

  public async initCookies() {
    const browseResponse = await this.amulApi.get<string>(
      "https://shop.amul.com/en/browse/protein",
    );

    const setCookies = browseResponse.headers["set-cookie"];
    if (!setCookies) throw new Error("No cookies received from Amul API");

    const requestUrl = "https://shop.amul.com";
    const host = new URL(requestUrl).hostname;

    for (const raw of setCookies) {
      const cookie = parseCookie(raw, { loose: true });
      if (!cookie?.key) continue;
      cookie.domain = host;
      await this.jar.setCookie(cookie.toString(), requestUrl);
    }

    const infoResponse = await this.amulApi.get<string>(
      `https://shop.amul.com/user/info.js?_v=${Date.now()}`,
      {
        headers: {
          ...defaultHeaders,
          cookie: await this.jar.getCookieString(requestUrl),
          tid: await this.buildTidHeader(),
        },
      },
    );

    const sessionObj = JSON.parse(
      infoResponse.data.replace("session = ", ""),
    ) as AmulSessionInfo;
    this.tid = sessionObj.tid;
  }

  get session_tid() {
    return this.tid;
  }

  get session_cookie() {
    return this.jar.getCookieString("https://shop.amul.com");
  }

  get pincode_record() {
    return this.pincodeRecord;
  }

  public async setPincode(record: PincodeRecord) {
    const tid = await this.buildTidHeader();
    const cookieStr = await this.jar.getCookieString("https://shop.amul.com");

    await this.amulApi.put(
      "https://shop.amul.com/entity/ms.settings/_/setPreferences",
      { data: { store: record.substore } },
      { headers: { ...defaultHeaders, tid, cookie: cookieStr } },
    );

    this.pincodeRecord = record;

    if (!substoreSessions.has(record.substore)) {
      substoreSessions.set(record.substore, this);
    }
  }

  public async searchPincode(pincode: string): Promise<PincodeRecord[]> {
    const response = await this.amulApi.get<AmulPincodeResponse>(
      `https://shop.amul.com/entity/pincode?limit=50&filters[0][field]=pincode&filters[0][value]=${pincode}&filters[0][operator]=regex&cf_cache=1h`,
      {
        headers: {
          ...defaultHeaders,
          tid: await this.buildTidHeader(),
          cookie: await this.jar.getCookieString("https://shop.amul.com"),
        },
      },
    );
    return response.data.records;
  }

  public getSubstoreAlias(): string | undefined {
    return this.pincodeRecord?.substore;
  }

  public getSubstoreId(): string | undefined {
    return SUBSTORES.find((s) => s.alias === this.pincodeRecord?.substore)?._id;
  }

  public getPincode(): string | undefined {
    return this.pincodeRecord?.pincode;
  }

  private async buildTidHeader(): Promise<string> {
    const timestamp = Date.now().toString();
    const rand = Math.floor(Math.random() * 1000);
    const sessionID = this.tid ?? "";
    const encoder = new TextEncoder();
    const bytes = encoder.encode(
      `${STORE_ID}:${timestamp}:${rand}:${sessionID}`,
    );
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `${timestamp}:${rand}:${hash}`;
  }

  private getProductsUrl(opts: {
    category: string;
    substoreId?: string;
    limit?: number;
    start?: number;
  }): string {
    const params = new URLSearchParams();
    for (const field of productFields) {
      params.append(`fields[${field}]`, "1");
    }
    params.append("filters[0][field]", "categories");
    params.append("filters[0][value][0]", opts.category);
    params.append("filters[0][operator]", "in");
    params.append("filters[0][original]", "1");
    params.append("facets", "true");
    params.append("facetgroup", "default_category_facet");
    params.append("limit", String(opts.limit ?? 8));
    params.append("total", "1");
    params.append("start", String(opts.start ?? 0));
    params.append("v", this.storeVersion.toString() || "4");
    params.append("device_type", "other");
    if (opts.substoreId) params.append("substore", opts.substoreId);
    const query = params.toString().replace(/%5B/g, "[").replace(/%5D/g, "]");
    return `https://shop.amul.com/api/1/entity/ms.products?${query}`;
  }

  public async getProducts(opts?: {
    category?: string;
    limit?: number;
    start?: number;
  }): Promise<{ data: AmulProduct[]; total: number }> {
    const versionPromise = this.ensureStoreVersion();
    const substoreId = this.getSubstoreId();
    const category = opts?.category ?? "protein";
    await versionPromise;

    const response = await this.amulApi.get<AmulProductsResponse>(
      this.getProductsUrl({ category, substoreId, limit: opts?.limit, start: opts?.start }),
      {
        headers: {
          ...defaultHeaders,
          referer: `https://shop.amul.com/en/browse/${category}`,
          cookie: await this.jar.getCookieString("https://shop.amul.com"),
          tid: await this.buildTidHeader(),
        },
      },
    );
    const products = response.data.data ?? [];
    const total = response.data.paging?.total ?? products.length;

    return { data: products, total };
  }

  public async getCoupons(): Promise<AmulCoupon[]> {
    const response = await this.amulApi.get<AmulCouponsResponse>(
      "https://shop.amul.com/entity/ms.carts/_/listCoupons",
      {
        headers: {
          ...defaultHeaders,
          tid: await this.buildTidHeader(),
          cookie: await this.jar.getCookieString("https://shop.amul.com"),
        },
      },
    );
    const now = new Date();
    return (response.data.records ?? []).filter(
      (c) =>
        c.enabled === "1" &&
        c.visible_on_frontend === "1" &&
        (!c.end_date || new Date(c.end_date) > now),
    );
  }

  public close() {
    if (this.pincodeRecord) {
      substoreSessions.delete(this.pincodeRecord.substore);
    }
  }
}

export async function getDefaultSession(): Promise<AmulApi> {
  if (!defaultSession) {
    defaultSession = new AmulApi();
    await defaultSession.initCookies();
  }
  return defaultSession;
}

export async function createAmulApi(pincode: string): Promise<AmulApi> {
  const session = await getDefaultSession();
  const records = await session.searchPincode(pincode);

  if (!records.length) {
    throw new AmulError(
      `No substore found for pincode ${pincode}`,
      AMUL_ERROR_CODE.PINCODE_NOT_FOUND,
    );
  }

  const record = records[0];
  const existing = substoreSessions.get(record.substore);
  if (existing) return existing;

  const api = new AmulApi();
  await api.initCookies();
  await api.setPincode(record);
  return api;
}
