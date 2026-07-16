"use client";

import Link from "next/link";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import catalogData from "@/data/catalog.json";
import { SiteHeader } from "@/components/site-header";
import type { CatalogItem, CatalogVariant } from "@/types/catalog";

const catalog = catalogData as CatalogItem[];
const cartStorageKey = "physicare-mock-cart";

type StoredCartLine = {
  itemId: string;
  variantId?: string;
  quantity: number;
};

type CartLine = StoredCartLine & {
  key: string;
  item: CatalogItem;
  variant?: CatalogVariant;
};

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

const primaryButton =
  "rounded-[10px] border px-4 py-3 text-center font-extrabold transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none";

const secondaryButton =
  "rounded-[10px] border border-[#dceaff] bg-[#eff6ff] px-4 py-3 text-center font-extrabold text-[#0a388f] transition hover:bg-[#e2edff]";

function itemPrice(item: CatalogItem, variant?: CatalogVariant): number {
  return variant?.price ?? item.price ?? item.variants?.[0]?.price ?? 0;
}

function cartKey(itemId: string, variantId?: string): string {
  return `${itemId}:${variantId ?? "default"}`;
}

function createLine(
  item: CatalogItem,
  variantId?: string,
  quantity = 1,
): CartLine {
  const variant =
    item.variants?.find((option) => option.id === variantId) ??
    item.variants?.[0];
  return {
    itemId: item.id,
    variantId: variant?.id,
    quantity,
    key: cartKey(item.id, variant?.id),
    item,
    variant,
  };
}

function hydrateCart(storedLines: StoredCartLine[]): CartLine[] {
  return storedLines
    .map((line) => {
      const item = catalog.find((candidate) => candidate.id === line.itemId);
      if (!item || item.type !== "product" || line.quantity < 1)
        return undefined;
      return createLine(item, line.variantId, line.quantity);
    })
    .filter((line): line is CartLine => Boolean(line));
}

function serializeCart(lines: CartLine[]): StoredCartLine[] {
  return lines.map(({ itemId, variantId, quantity }) => ({
    itemId,
    variantId,
    quantity,
  }));
}

export function Storefront() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<
    Record<string, string>
  >({});
  const [cartLoaded, setCartLoaded] = useState(false);

  const services = useMemo(
    () => catalog.filter((item) => item.type === "service"),
    [],
  );
  const products = useMemo(
    () => catalog.filter((item) => item.type === "product"),
    [],
  );
  const cartCount = cart.reduce((total, line) => total + line.quantity, 0);
  const subtotal = cart.reduce(
    (total, line) => total + itemPrice(line.item, line.variant) * line.quantity,
    0,
  );

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(cartStorageKey);
      if (storedValue) {
        setCart(hydrateCart(JSON.parse(storedValue) as StoredCartLine[]));
      }
    } catch {
      window.localStorage.removeItem(cartStorageKey);
    } finally {
      setCartLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!cartLoaded) return;
    window.localStorage.setItem(
      cartStorageKey,
      JSON.stringify(serializeCart(cart)),
    );
  }, [cart, cartLoaded]);

  function getSelectedVariant(item: CatalogItem): CatalogVariant | undefined {
    const selectedId = selectedVariants[item.id];
    return (
      item.variants?.find((variant) => variant.id === selectedId) ??
      item.variants?.[0]
    );
  }

  function addToCart(item: CatalogItem) {
    const variant = getSelectedVariant(item);
    const key = cartKey(item.id, variant?.id);

    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) {
        return current.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...current, createLine(item, variant?.id)];
    });
    toast.success(`Added ${item.name} to cart`, {
      description: variant?.label,
    });
  }

  function updateQuantity(key: string, amount: number) {
    setCart((current) =>
      current
        .map((line) =>
          line.key === key
            ? { ...line, quantity: Math.max(0, line.quantity + amount) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f8fc]">
      <SiteHeader
        cartCount={cartCount}
        onCartClick={() => setCartOpen(true)}
        showCart
      />

      <main className="mx-auto grid w-[min(1220px,calc(100%-34px))] gap-10 py-10 sm:gap-12 sm:py-14">
        <ServiceSection services={services} />
        <ProductSection
          title="Other Products"
          eyebrow="Shop recovery items"
          items={products}
          selectedVariants={selectedVariants}
          onSelectVariant={setSelectedVariants}
          onAdd={addToCart}
        />
      </main>

      <CartModal
        cart={cart}
        cartCount={cartCount}
        open={cartOpen}
        subtotal={subtotal}
        onClose={() => setCartOpen(false)}
        onClear={() => setCart([])}
        onRemove={(key) =>
          setCart((current) => current.filter((line) => line.key !== key))
        }
        onUpdateQuantity={updateQuantity}
      />

      <footer className="flex flex-col gap-2 border-t border-[#dfe7f1] bg-white px-[clamp(20px,4vw,64px)] py-6 text-xs text-[#64748b] sm:flex-row sm:items-center sm:justify-between">
        <strong className="text-sm text-[#0a388f]">
          © PhysiCare Therapy Wellness Center
        </strong>
        <span>
          For more details and inquiry, send us an email at
          PhysiCareTherapy@gmail.com or message us at (+63) 912-3456-789 / (02)
          123-4567
        </span>
      </footer>
    </div>
  );
}

function ServiceSection({ services }: { services: CatalogItem[] }) {
  return (
    <section>
      <div className="mb-5">
        <h2 className="mt-1 text-3xl font-black tracking-tight text-[#111827]">
          Services
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => (
          <article
            className="overflow-hidden rounded-[18px] border border-[#dfe7f1] bg-white transition hover:-translate-y-1 hover:border-[#b7cdf0] hover:shadow-[0_15px_40px_rgba(13,49,101,.09)]"
            key={service.id}
          >
            <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-b from-[#fbfdff] to-[#f1f6fc]">
              <img
                src={service.image}
                alt={service.name}
                className="h-full w-full object-cover scale-[132%] mix-blend-multiply"
              />
            </div>
            <div className="p-5">
              <span className="text-[11px] font-extrabold uppercase tracking-[.08em] text-[#165bc8]">
                {service.category}
              </span>
              <h3 className="mt-1.5 text-lg font-extrabold text-[#111827]">
                {service.name}
              </h3>
              <p className="mt-2 min-h-[72px] text-sm leading-6 text-[#64748b]">
                {service.description}
              </p>
              <Link
                className={`${secondaryButton} mt-5 block w-full no-underline`}
                href={`/booking?service=${encodeURIComponent(service.id)}`}
              >
                Book appointment
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

type ProductSectionProps = {
  title: string;
  eyebrow: string;
  items: CatalogItem[];
  selectedVariants: Record<string, string>;
  onSelectVariant: Dispatch<SetStateAction<Record<string, string>>>;
  onAdd: (item: CatalogItem) => void;
};

function ProductSection({
  title,
  eyebrow,
  items,
  selectedVariants,
  onSelectVariant,
  onAdd,
}: ProductSectionProps) {
  return (
    <section>
      <div className="mb-5">
        <h2 className="mt-1 text-3xl font-black tracking-tight text-[#111827]">
          {title}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const variant =
            item.variants?.find(
              (option) => option.id === selectedVariants[item.id],
            ) ?? item.variants?.[0];

          return (
            <article
              className="overflow-hidden rounded-[18px] border border-[#dfe7f1] bg-white transition hover:-translate-y-1 hover:border-[#b7cdf0] hover:shadow-[0_15px_40px_rgba(13,49,101,.09)]"
              key={item.id}
            >
              <div className="relative h-[205px] bg-gradient-to-b from-[#fbfdff] to-[#f1f6fc] p-4 sm:h-[230px] md:h-[205px]">
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-contain mix-blend-multiply"
                />
              </div>
              <div className="p-5">
                <span className="text-[11px] font-extrabold uppercase tracking-[.08em] text-[#165bc8]">
                  {item.category}
                </span>
                <h3 className="mt-1.5 text-lg font-extrabold text-[#111827]">
                  {item.name}
                </h3>
                <p className="mt-2 min-h-[58px] text-sm leading-6 text-[#64748b]">
                  {item.description}
                </p>
                {item.variants && (
                  <label className="mt-4 grid gap-1.5 text-xs font-extrabold text-[#334155]">
                    Option
                    <select
                      className="w-full rounded-[9px] border border-[#dfe7f1] bg-white px-3 py-2.5 text-[#111827]"
                      value={variant?.id}
                      onChange={(event) =>
                        onSelectVariant((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                    >
                      {item.variants.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label} - {peso.format(option.price)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="mt-5 flex items-center justify-between gap-3">
                  <strong className="text-lg">
                    {peso.format(itemPrice(item, variant))}
                  </strong>
                  <button
                    className={
                      secondaryButton +
                      " flex items-center justify-between gap-2"
                    }
                    type="button"
                    onClick={() => onAdd(item)}
                  >
                    <Plus className="h-3 w-3" />
                    Add to cart
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

type CartModalProps = {
  cart: CartLine[];
  cartCount: number;
  open: boolean;
  subtotal: number;
  onClose: () => void;
  onClear: () => void;
  onRemove: (key: string) => void;
  onUpdateQuantity: (key: string, amount: number) => void;
};

function CartModal({
  cart,
  cartCount,
  open,
  subtotal,
  onClose,
  onClear,
  onRemove,
  onUpdateQuantity,
}: CartModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/55"
      role="presentation"
      onMouseDown={onClose}
    >
      <aside
        className="flex h-screen w-full max-w-[480px] flex-col bg-white p-5 shadow-[-22px_0_70px_rgba(15,23,42,.18)] sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between gap-5 border-b border-[#dfe7f1] pb-5">
          <div>
            <span className="text-xs font-black uppercase tracking-[.13em] text-[#165bc8]">
              Your selection
            </span>
            <h2
              id="cart-modal-title"
              className="mt-1 text-3xl font-black tracking-tight"
            >
              Cart
            </h2>
          </div>
          <button
            className="grid h-10 w-10 place-items-center rounded-[10px] border border-[#dfe7f1] bg-white font-black text-[#111827]"
            type="button"
            onClick={onClose}
            aria-label="Close cart"
          >
            X
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#eff6ff] text-3xl text-[#165bc8]">
              +
            </span>
            <strong className="mt-3">Your cart is empty</strong>
            <p className="mt-1 text-sm text-[#64748b]">
              Add a product to begin.
            </p>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-auto pr-1">
              {cart.map((line) => (
                <div
                  className="grid grid-cols-[58px_minmax(0,1fr)] gap-3 border-b border-[#edf1f6] py-3"
                  key={line.key}
                >
                  <img
                    src={line.item.image}
                    alt=""
                    className="h-[58px] w-[58px] rounded-[9px] bg-[#f5f8fc] object-contain"
                  />
                  <div className="min-w-0">
                    <strong className="block truncate text-sm">
                      {line.item.name}
                    </strong>
                    {line.variant && (
                      <span className="mt-0.5 block text-xs text-[#64748b]">
                        {line.variant.label}
                      </span>
                    )}
                    <small className="mt-0.5 block text-xs text-[#64748b]">
                      {peso.format(itemPrice(line.item, line.variant))}
                    </small>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="grid grid-cols-[28px_28px_28px] overflow-hidden rounded-lg border border-[#dfe7f1] text-center">
                        <button
                          className="h-8 bg-[#f7f9fc] text-[#0a388f]"
                          type="button"
                          onClick={() => onUpdateQuantity(line.key, -1)}
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="grid place-items-center text-xs font-extrabold">
                          {line.quantity}
                        </span>
                        <button
                          className="h-8 bg-[#f7f9fc] text-[#0a388f]"
                          type="button"
                          onClick={() => onUpdateQuantity(line.key, 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <strong className="ml-auto text-sm">
                        {peso.format(
                          itemPrice(line.item, line.variant) * line.quantity,
                        )}
                      </strong>
                      <button
                        className="border-0 bg-transparent text-xs font-extrabold text-[#c0392b]"
                        type="button"
                        onClick={() => onRemove(line.key)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="mt-3 self-start border-0 bg-transparent font-extrabold text-[#165bc8]"
              type="button"
              onClick={onClear}
            >
              Clear cart
            </button>
          </>
        )}

        <div className="mt-5 border-t border-[#dfe7f1] pt-4">
          <div className="flex justify-between py-1 text-sm text-[#64748b]">
            <span>Items</span>
            <strong className="text-[#111827]">{cartCount}</strong>
          </div>
          <div className="flex justify-between py-1 text-sm text-[#64748b]">
            <span>Mock delivery</span>
            <strong className="text-[#111827]">Free</strong>
          </div>
          <div className="mt-2 flex justify-between border-t border-dashed border-[#cbd5e1] pt-3 text-base text-[#111827]">
            <span>Total</span>
            <strong>{peso.format(subtotal)}</strong>
          </div>
        </div>
        {cart.length === 0 ? (
          <button
            className={`${primaryButton} mt-4 w-full`}
            type="button"
            disabled
          >
            Checkout
          </button>
        ) : (
          <Link
            className={`${primaryButton} mt-4 block w-full no-underline`}
            href="/checkout"
            onClick={onClose}
          >
            Checkout
          </Link>
        )}
      </aside>
    </div>
  );
}
