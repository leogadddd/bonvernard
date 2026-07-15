export type CatalogVariant = {
  id: string;
  label: string;
  price: number;
};

export type CatalogItem = {
  id: string;
  type: "product" | "service";
  name: string;
  category: string;
  description: string;
  image: string;
  price?: number;
  variants?: CatalogVariant[];
};

export type CartLine = {
  key: string;
  item: CatalogItem;
  quantity: number;
  variant?: CatalogVariant;
};
