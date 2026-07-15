"use client";

import { FormEvent, useMemo, useState } from "react";
import catalogData from "@/data/catalog.json";
import type { CartLine, CatalogItem, CatalogVariant } from "@/types/catalog";

const catalog = catalogData as CatalogItem[];
type Filter = "all" | "product" | "service";
type Stage = "shop" | "checkout" | "confirmation";
type CheckoutFields = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
};

const initialFields: CheckoutFields = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  cardName: "",
  cardNumber: "",
  expiry: "",
  cvc: "",
};

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

function luhnValid(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let doubleDigit = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

function validExpiry(value: string): boolean {
  const match = value.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const now = new Date();
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

function createOrderNumber(): string {
  const date = new Date();
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PHY-${datePart}-${randomPart}`;
}

function linePrice(line: CartLine): number {
  return line.variant?.price ?? line.item.price ?? 0;
}

function itemPrice(item: CatalogItem, variant?: CatalogVariant): number {
  return variant?.price ?? item.price ?? item.variants?.[0]?.price ?? 0;
}

export function Storefront() {
  const [filter, setFilter] = useState<Filter>("all");
  const [stage, setStage] = useState<Stage>("shop");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<CheckoutFields>(initialFields);
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFields, string>>>({});
  const [orderNumber, setOrderNumber] = useState("");

  const visibleItems = useMemo(
    () => catalog.filter((item) => filter === "all" || item.type === filter),
    [filter],
  );

  const cartCount = cart.reduce((total, line) => total + line.quantity, 0);
  const subtotal = cart.reduce((total, line) => total + linePrice(line) * line.quantity, 0);

  function getVariant(item: CatalogItem): CatalogVariant | undefined {
    const requestedId = selectedVariants[item.id];
    return item.variants?.find((variant) => variant.id === requestedId) ?? item.variants?.[0];
  }

  function addToCart(item: CatalogItem) {
    const variant = getVariant(item);
    const key = `${item.id}:${variant?.id ?? "default"}`;
    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) {
        return current.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...current, { key, item, variant, quantity: 1 }];
    });
  }

  function updateQuantity(key: string, amount: number) {
    setCart((current) =>
      current
        .map((line) =>
          line.key === key ? { ...line, quantity: Math.max(0, line.quantity + amount) } : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof CheckoutFields, string>> = {};
    const cardDigits = fields.cardNumber.replace(/\D/g, "");
    const phoneDigits = fields.phone.replace(/\D/g, "");

    if (fields.fullName.trim().length < 3) nextErrors.fullName = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(fields.email)) nextErrors.email = "Enter a valid email address.";
    if (phoneDigits.length < 7 || phoneDigits.length > 15) nextErrors.phone = "Enter a valid phone number.";
    if (fields.address.trim().length < 5) nextErrors.address = "Enter a complete street or unit address.";
    if (fields.city.trim().length < 2) nextErrors.city = "Enter a city or municipality.";
    if (fields.province.trim().length < 2) nextErrors.province = "Enter a province or region.";
    if (!/^[A-Za-z0-9][A-Za-z0-9 -]{2,9}$/.test(fields.postalCode.trim())) {
      nextErrors.postalCode = "Enter a valid postal code.";
    }
    if (fields.cardName.trim().length < 3) nextErrors.cardName = "Enter the name shown on the card.";
    if (!luhnValid(cardDigits)) nextErrors.cardNumber = "Enter a valid test card number.";
    if (!validExpiry(fields.expiry)) nextErrors.expiry = "Use a future date in MM/YY format.";
    if (!/^\d{3,4}$/.test(fields.cvc)) nextErrors.cvc = "Enter a 3 or 4 digit security code.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    setOrderNumber(createOrderNumber());
    setStage("confirmation");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateField(field: keyof CheckoutFields, value: string) {
    let formatted = value;
    if (field === "cardNumber") {
      formatted = value
        .replace(/\D/g, "")
        .slice(0, 19)
        .replace(/(.{4})/g, "$1 ")
        .trim();
    }
    if (field === "expiry") {
      const digits = value.replace(/\D/g, "").slice(0, 4);
      formatted = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
    }
    if (field === "cvc") formatted = value.replace(/\D/g, "").slice(0, 4);
    setFields((current) => ({ ...current, [field]: formatted }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function resetOrder() {
    setStage("shop");
    setCart([]);
    setFields(initialFields);
    setErrors({});
    setOrderNumber("");
  }

  return (
    <div className="store-app">
      <header className="store-header">
        <div className="store-brand">
          <span className="store-logo">+</span>
          <div>
            <strong>PhysiCare</strong>
            <span>Products &amp; Services</span>
          </div>
        </div>
        <div className="cart-pill" aria-label={`${cartCount} cart items`}>
          <span aria-hidden="true">▣</span>
          <strong>{cartCount}</strong>
        </div>
      </header>

      <section className="store-hero">
        <span className="eyebrow light">Physical therapy essentials</span>
        <h1>Care, recovery, and mobility in one place.</h1>
        <p>Add products or services to the cart, then complete the mock checkout.</p>
      </section>

      <div className="progress" aria-label="Checkout progress">
        {[
          ["shop", "1", "Choose items"],
          ["checkout", "2", "Checkout"],
          ["confirmation", "3", "Confirmation"],
        ].map(([value, number, label]) => {
          const order = { shop: 0, checkout: 1, confirmation: 2 } as const;
          const active = order[stage] >= order[value as Stage];
          return (
            <div className={active ? "progress-step active" : "progress-step"} key={value}>
              <span>{number}</span>
              <strong>{label}</strong>
            </div>
          );
        })}
      </div>

      {stage === "shop" && (
        <main className="store-layout">
          <section className="catalog-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Our catalogue</span>
                <h2>Products and services</h2>
              </div>
              <div className="filter-tabs" role="group" aria-label="Catalogue filters">
                {(["all", "product", "service"] as Filter[]).map((value) => (
                  <button
                    className={filter === value ? "active" : ""}
                    key={value}
                    onClick={() => setFilter(value)}
                    type="button"
                  >
                    {value === "all" ? "All" : `${value[0].toUpperCase()}${value.slice(1)}s`}
                  </button>
                ))}
              </div>
            </div>

            <div className="catalog-grid">
              {visibleItems.map((item) => {
                const variant = getVariant(item);
                return (
                  <article className="catalog-card" key={item.id}>
                    <div className="catalog-image-wrap">
                      <span className={`type-badge ${item.type}`}>{item.type}</span>
                      <img src={item.image} alt={item.name} className="catalog-image" />
                    </div>
                    <div className="catalog-body">
                      <span className="category">{item.category}</span>
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      {item.variants && (
                        <label className="variant-label">
                          Option
                          <select
                            value={variant?.id}
                            onChange={(event) =>
                              setSelectedVariants((current) => ({
                                ...current,
                                [item.id]: event.target.value,
                              }))
                            }
                          >
                            {item.variants.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label} — {peso.format(option.price)}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <div className="card-footer">
                        <strong>{peso.format(itemPrice(item, variant))}</strong>
                        <button type="button" onClick={() => addToCart(item)}>
                          Add to cart
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="cart-panel">
            <div className="cart-title">
              <div>
                <span className="eyebrow">Your selection</span>
                <h2>Cart</h2>
              </div>
              <span>{cartCount} item{cartCount === 1 ? "" : "s"}</span>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <span aria-hidden="true">＋</span>
                <strong>Your cart is empty</strong>
                <p>Add a product or service to begin.</p>
              </div>
            ) : (
              <div className="cart-lines">
                {cart.map((line) => (
                  <div className="cart-line" key={line.key}>
                    <img src={line.item.image} alt="" />
                    <div className="cart-line-copy">
                      <strong>{line.item.name}</strong>
                      {line.variant && <span>{line.variant.label}</span>}
                      <small>{peso.format(linePrice(line))}</small>
                    </div>
                    <div className="quantity-control" aria-label={`Quantity for ${line.item.name}`}>
                      <button type="button" onClick={() => updateQuantity(line.key, -1)} aria-label="Decrease quantity">−</button>
                      <span>{line.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(line.key, 1)} aria-label="Increase quantity">+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="cart-summary">
              <div><span>Subtotal</span><strong>{peso.format(subtotal)}</strong></div>
              <div><span>Mock delivery</span><strong>Free</strong></div>
              <div className="total"><span>Total</span><strong>{peso.format(subtotal)}</strong></div>
            </div>
            <button
              className="primary-button wide"
              disabled={cart.length === 0}
              onClick={() => {
                setStage("checkout");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              type="button"
            >
              Continue to checkout
            </button>
          </aside>
        </main>
      )}

      {stage === "checkout" && (
        <main className="checkout-layout">
          <form className="checkout-form" onSubmit={submitOrder} noValidate>
            <div className="section-heading compact">
              <div>
                <span className="eyebrow">Mock checkout</span>
                <h2>Billing and payment details</h2>
              </div>
              <button className="text-button" type="button" onClick={() => setStage("shop")}>← Back to shop</button>
            </div>

            <div className="form-card">
              <h3>Contact information</h3>
              <div className="form-grid">
                <Field label="Full name" name="fullName" value={fields.fullName} error={errors.fullName} onChange={updateField} autoComplete="name" />
                <Field label="Email address" name="email" type="email" value={fields.email} error={errors.email} onChange={updateField} autoComplete="email" />
                <Field label="Phone number" name="phone" type="tel" value={fields.phone} error={errors.phone} onChange={updateField} autoComplete="tel" />
              </div>
            </div>

            <div className="form-card">
              <h3>Billing address</h3>
              <div className="form-grid">
                <Field label="Street, building, or unit number" name="address" value={fields.address} error={errors.address} onChange={updateField} autoComplete="street-address" wide />
                <Field label="City / Municipality" name="city" value={fields.city} error={errors.city} onChange={updateField} autoComplete="address-level2" />
                <Field label="Province / Region" name="province" value={fields.province} error={errors.province} onChange={updateField} autoComplete="address-level1" />
                <Field label="Postal code" name="postalCode" value={fields.postalCode} error={errors.postalCode} onChange={updateField} autoComplete="postal-code" inputMode="numeric" />
              </div>
            </div>

            <div className="form-card">
              <div className="form-card-heading">
                <h3>Payment details</h3>
                <span>Mock payment only</span>
              </div>
              <p className="test-card-note">Use any Luhn-valid test number, such as 4242 4242 4242 4242, a future expiry date, and any 3-digit CVC.</p>
              <div className="form-grid">
                <Field label="Name on card" name="cardName" value={fields.cardName} error={errors.cardName} onChange={updateField} autoComplete="cc-name" wide />
                <Field label="Card number" name="cardNumber" value={fields.cardNumber} error={errors.cardNumber} onChange={updateField} autoComplete="cc-number" inputMode="numeric" wide />
                <Field label="Expiry (MM/YY)" name="expiry" value={fields.expiry} error={errors.expiry} onChange={updateField} autoComplete="cc-exp" inputMode="numeric" />
                <Field label="CVC" name="cvc" value={fields.cvc} error={errors.cvc} onChange={updateField} autoComplete="cc-csc" inputMode="numeric" />
              </div>
            </div>

            <button className="primary-button wide checkout-submit" type="submit">
              Complete mock order · {peso.format(subtotal)}
            </button>
          </form>

          <aside className="order-panel">
            <span className="eyebrow">Order summary</span>
            <h2>Your order</h2>
            <div className="order-lines">
              {cart.map((line) => (
                <div className="order-line" key={line.key}>
                  <img src={line.item.image} alt="" />
                  <div>
                    <strong>{line.item.name}</strong>
                    <span>{line.variant?.label ? `${line.variant.label} · ` : ""}Qty {line.quantity}</span>
                  </div>
                  <b>{peso.format(linePrice(line) * line.quantity)}</b>
                </div>
              ))}
            </div>
            <div className="cart-summary">
              <div><span>Subtotal</span><strong>{peso.format(subtotal)}</strong></div>
              <div><span>Mock delivery</span><strong>Free</strong></div>
              <div className="total"><span>Total</span><strong>{peso.format(subtotal)}</strong></div>
            </div>
          </aside>
        </main>
      )}

      {stage === "confirmation" && (
        <main className="confirmation-page">
          <div className="confirmation-icon">✓</div>
          <span className="eyebrow">Order confirmed</span>
          <h2>Thank you, {fields.fullName.split(" ")[0] || "customer"}.</h2>
          <p>This is a successful mock checkout. No payment was charged and no real order was created.</p>
          <div className="order-number">
            <span>Mock order number</span>
            <strong>{orderNumber}</strong>
          </div>
          <div className="confirmation-summary">
            <span>Total</span>
            <strong>{peso.format(subtotal)}</strong>
          </div>
          <button className="primary-button" type="button" onClick={resetOrder}>Start another mock order</button>
        </main>
      )}

      <footer className="store-footer">
        <strong>PhysiCare</strong>
        <span>Demonstration checkout only. No real payments are processed.</span>
      </footer>
    </div>
  );
}

type FieldProps = {
  label: string;
  name: keyof CheckoutFields;
  value: string;
  error?: string;
  onChange: (field: keyof CheckoutFields, value: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  wide?: boolean;
};

function Field({
  label,
  name,
  value,
  error,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
  wide,
}: FieldProps) {
  return (
    <label className={wide ? "field wide" : "field"}>
      <span>{label}</span>
      <input
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        autoComplete={autoComplete}
        inputMode={inputMode}
        name={name}
        onChange={(event) => onChange(name, event.target.value)}
        type={type}
        value={value}
      />
      {error && <small id={`${name}-error`}>{error}</small>}
    </label>
  );
}
