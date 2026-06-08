export type Substore = {
  _id: string;
  alias: string;
  name: string;
};

export type PincodeRecord = {
  pincode: string;
  substore: string;
};

export type AmulSessionInfo = {
  tid: string;
};

export type AmulPincodeResponse = {
  records: PincodeRecord[];
};

export type AmulProduct = {
  _id: string;
  name: string;
  alias: string;
  sku?: string;
  available: number;
  inventory_quantity?: number;
  inventory_allow_out_of_stock?: number;
  images?: Array<{ image: string }>;
  price?: number;
  compare_price?: number;
  original_price?: number;
  categories?: string[];
  metafields?: Record<string, string | number | boolean | null | undefined>;
  discounts?: Array<{ discount_type?: string; discount_value?: number }>;
};

export type AmulCoupon = {
  _id: string;
  coupon_code: string;
  name: string;
  description?: string;
  type: string;
  amount: number;
  maximum_discount?: number;
  end_date?: string;
  enabled: string;
  visible_on_frontend: string;
};

export type AmulCouponsResponse = {
  records: AmulCoupon[];
  total: number;
};

export type AmulProductsResponse = {
  data: AmulProduct[];
  paging: {
    total: number;
    start: number;
    limit: number;
    count: number;
  };
};

export type ProductAvailability = {
  pincode: string;
  substoreAlias: string;
  substoreId: string;

  productId: string;
  name: string;
  alias: string;

  available: boolean;

  inventoryQuantity?: number;
  inventoryAllowOutOfStock?: boolean;

  imageUrl?: string;
  price?: number;
  mrp?: number;
  discount?: number;
  label?: "new" | "bestseller" | "trending";
  productUrl: string;

  source: "amul";
};
