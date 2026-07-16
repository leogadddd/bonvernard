export type CatalogVariant = {
  id: string;
  label: string;
  price: number;
};

export type BookingType = {
  id: string;
  label: string;
};

export type CatalogItem = {
  id: string;
  type: "product" | "service";
  name: string;
  category: string;
  description: string;
  image: string;
  bookingTypes?: BookingType[];
  price?: number;
  variants?: CatalogVariant[];
};

export type CartLine = {
  key: string;
  item: CatalogItem;
  quantity: number;
  variant?: CatalogVariant;
};
