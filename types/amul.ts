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
  images?: Array<{ url: string }>;
  price?: number;
  mrp?: number;
  categories?: string[];
};

export type AmulProductsResponse = {
  data: AmulProduct[];
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
  productUrl: string;

  source: "amul";
};
