"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Banknote,
  CreditCard,
  MapPin,
  Package,
  QrCode,
  ReceiptText,
  Smartphone,
  Store,
  Truck,
  Wallet,
} from "lucide-react";
import catalogData from "@/data/catalog.json";
import checkoutConfig from "@/data/checkout.json";
import { SiteHeader } from "@/components/site-header";
import type { CatalogItem, CatalogVariant } from "@/types/catalog";

const catalog = catalogData as CatalogItem[];
const cartStorageKey = "physicare-mock-cart";

type StoredCartLine = {
  itemId: string;
  variantId?: string;
  quantity: number;
};

type CheckoutLine = StoredCartLine & {
  key: string;
  item: CatalogItem;
  variant?: CatalogVariant;
};

type CheckoutStep =
  | "fulfillment"
  | "address"
  | "payment"
  | "review"
  | "confirmation";
type Fulfillment = "delivery" | "pickup";
type Payment = "cod" | "card" | "qrph" | "gcash";
type Voucher = {
  code: string;
  label: string;
  type: "percentage" | "fixed";
  value: number;
};
type CheckoutFields = {
  recipient: string;
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

const config = checkoutConfig as { deliveryFee: number; vouchers: Voucher[] };
const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});
const primaryButton =
  "rounded-[10px] border px-4 py-3 text-center font-extrabold transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none";
const secondaryButton =
  "rounded-[10px] border border-[#dfe7f1] px-4 py-3 text-center font-extrabold text-[#111827] transition hover:bg-[#f5f8fc] disabled:cursor-not-allowed disabled:opacity-45";

function itemPrice(item: CatalogItem, variant?: CatalogVariant): number {
  return variant?.price ?? item.price ?? item.variants?.[0]?.price ?? 0;
}

function hydrateCart(storedLines: StoredCartLine[]): CheckoutLine[] {
  return storedLines
    .map((line): CheckoutLine | undefined => {
      const item = catalog.find((candidate) => candidate.id === line.itemId);
      if (!item || item.type !== "product" || line.quantity < 1)
        return undefined;
      const variant =
        item.variants?.find((option) => option.id === line.variantId) ??
        item.variants?.[0];
      return {
        ...line,
        variant,
        variantId: variant?.id,
        item,
        key: `${item.id}:${variant?.id ?? "default"}`,
      };
    })
    .filter((line): line is CheckoutLine => Boolean(line));
}

function createOrderId(): string {
  return `PHY-ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function voucherDiscount(subtotal: number, voucher?: Voucher): number {
  if (!voucher) return 0;
  const discount =
    voucher.type === "percentage"
      ? subtotal * (voucher.value / 100)
      : voucher.value;
  return Math.min(subtotal, Math.max(0, discount));
}

export function CheckoutPageClient() {
  const [cart, setCart] = useState<CheckoutLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState<CheckoutStep>("fulfillment");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [payment, setPayment] = useState<Payment>("cod");
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherError, setVoucherError] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | undefined>();
  const [fields, setFields] = useState<CheckoutFields>({
    recipient: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvc: "",
  });

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(cartStorageKey);
      if (storedValue) {
        setCart(hydrateCart(JSON.parse(storedValue) as StoredCartLine[]));
      }
    } catch {
      window.localStorage.removeItem(cartStorageKey);
    } finally {
      setLoaded(true);
    }
  }, []);

  const cartCount = cart.reduce((total, line) => total + line.quantity, 0);
  const subtotal = cart.reduce(
    (total, line) => total + itemPrice(line.item, line.variant) * line.quantity,
    0,
  );
  const discount = voucherDiscount(subtotal, appliedVoucher);
  const shipping =
    fulfillment === "delivery" && cart.length > 0 ? config.deliveryFee : 0;
  const total = Math.max(0, subtotal - discount) + shipping;
  const deliveryValid =
    fulfillment === "pickup" ||
    (fields.recipient.trim().length > 1 &&
      fields.phone.trim().length > 6 &&
      fields.address.trim().length > 4 &&
      fields.city.trim().length > 1 &&
      fields.province.trim().length > 1 &&
      fields.postalCode.trim().length > 2);
  const cardValid =
    payment !== "card" ||
    (fields.cardName.trim().length > 1 &&
      fields.cardNumber.replace(/\D/g, "").length >= 13 &&
      fields.expiry.trim().length >= 4 &&
      fields.cvc.trim().length >= 3);
  const steps: CheckoutStep[] =
    fulfillment === "delivery"
      ? ["fulfillment", "address", "payment", "review", "confirmation"]
      : ["fulfillment", "payment", "review", "confirmation"];
  const stepIndex = steps.indexOf(step);
  const canContinue =
    (step === "fulfillment" && cart.length > 0) ||
    (step === "address" && deliveryValid) ||
    (step === "payment" && cardValid) ||
    step === "review";

  function updateField(field: keyof CheckoutFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  function goNext() {
    if (!canContinue) return;
    const nextStep = steps[stepIndex + 1];
    if (nextStep === "confirmation") {
      submitOrder();
      return;
    }
    if (nextStep) setStep(nextStep);
  }

  function goBack() {
    const previousStep = steps[stepIndex - 1];
    if (previousStep) setStep(previousStep);
  }

  function chooseFulfillment(value: Fulfillment) {
    setFulfillment(value);
    if (value === "pickup" && step === "address") setStep("payment");
  }

  function applyVoucher() {
    const requestedCode = voucherCode.trim().toUpperCase();
    const voucher = config.vouchers.find(
      (candidate) => candidate.code.toUpperCase() === requestedCode,
    );
    if (!voucher) {
      setAppliedVoucher(undefined);
      setVoucherError("Voucher code not found.");
      return;
    }
    setAppliedVoucher(voucher);
    setVoucherCode(voucher.code);
    setVoucherError("");
  }

  function removeVoucher() {
    setAppliedVoucher(undefined);
    setVoucherCode("");
    setVoucherError("");
  }

  function submitOrder() {
    if (cart.length === 0 || !deliveryValid || !cardValid || submitting) return;
    setSubmitting(true);
    window.setTimeout(() => {
      setOrderId(createOrderId());
      setSubmitting(false);
      setStep("confirmation");
    }, 900);
  }

  return (
    <div className="min-h-screen bg-[#f5f8fc]">
      <SiteHeader cartCount={cartCount} showCart={false} />
      <main className="mx-auto grid w-[min(1120px,calc(100%-32px))] gap-6 py-10 lg:grid-cols-[380px_minmax(0,1fr)]">
        <OrderSummary
          cart={cart}
          discount={discount}
          loaded={loaded}
          shipping={shipping}
          subtotal={subtotal}
          total={total}
        />

        <section className="rounded-[18px] h-min border border-[#dfe7f1] bg-white p-5 shadow-[0_18px_60px_rgba(13,49,101,.08)] sm:p-6">
          {submitting ? (
            <SubmittingState />
          ) : step === "confirmation" ? (
            <Confirmation
              fulfillment={fulfillment}
              orderId={orderId}
              payment={payment}
              total={total}
            />
          ) : (
            <div className="grid gap-6">
              <div>
                <h1 className="mt-1 text-2xl font-black tracking-tight">
                  Complete product order
                </h1>
              </div>

              <StepPills steps={steps} currentStep={step} />

              {step === "fulfillment" && (
                <FulfillmentSelector
                  fulfillment={fulfillment}
                  onChange={chooseFulfillment}
                />
              )}

              {step === "address" && (
                <DeliveryFields fields={fields} onChange={updateField} />
              )}

              {step === "payment" && (
                <>
                  <PaymentSelector payment={payment} onChange={setPayment} />
                  <PaymentPanel
                    fields={fields}
                    onChange={updateField}
                    payment={payment}
                  />
                  <VoucherBox
                    appliedVoucher={appliedVoucher}
                    error={voucherError}
                    onApply={applyVoucher}
                    onChange={setVoucherCode}
                    onRemove={removeVoucher}
                    value={voucherCode}
                  />
                </>
              )}

              {step === "review" && (
                <ReviewPanel
                  fulfillment={fulfillment}
                  payment={payment}
                  shipping={shipping}
                  subtotal={subtotal}
                  discount={discount}
                  total={total}
                />
              )}

              <div className="flex justify-between gap-3 border-t border-[#dfe7f1] pt-5">
                <button
                  className={secondaryButton}
                  disabled={stepIndex === 0}
                  onClick={goBack}
                  type="button"
                >
                  Back
                </button>
                <button
                  className={primaryButton}
                  disabled={!canContinue || submitting}
                  onClick={goNext}
                  type="button"
                >
                  {steps[stepIndex + 1] === "confirmation"
                    ? "Submit order"
                    : "Next"}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StepPills({
  currentStep,
  steps,
}: {
  currentStep: CheckoutStep;
  steps: CheckoutStep[];
}) {
  const currentIndex = steps.indexOf(currentStep);
  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((item, index) => (
        <span
          className={
            index <= currentIndex
              ? "rounded-full bg-[#0a388f] px-3 py-1 text-xs font-extrabold capitalize text-white"
              : "rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-extrabold capitalize text-[#0a388f]"
          }
          key={item}
        >
          {index + 1}. {item}
        </span>
      ))}
    </div>
  );
}

function OrderSummary({
  cart,
  discount,
  loaded,
  shipping,
  subtotal,
  total,
}: {
  cart: CheckoutLine[];
  discount: number;
  loaded: boolean;
  shipping: number;
  subtotal: number;
  total: number;
}) {
  return (
    <aside className="self-start rounded-[18px] border border-[#dfe7f1] bg-white p-5">
      <div className="flex items-center gap-3">
        <ReceiptText aria-hidden="true" className="h-5 w-5 text-[#0a388f]" />
        <div>
          <h2 className="text-2xl font-black tracking-tight">Cart breakdown</h2>
        </div>
      </div>

      {!loaded ? (
        <p className="mt-6 text-sm text-[#64748b]">Loading cart...</p>
      ) : cart.length === 0 ? (
        <div className="mt-6 rounded-[14px] border border-[#dfe7f1] p-4 text-sm text-[#64748b]">
          <strong className="block text-[#111827]">Your cart is empty</strong>
          <Link
            className="mt-3 inline-flex font-extrabold text-[#0a388f]"
            href="/"
          >
            Return to products
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-5 grid max-h-[310px] gap-3 overflow-y-auto pr-1">
            {cart.map((line) => (
              <div
                className="grid grid-cols-[54px_minmax(0,1fr)_auto] gap-3"
                key={line.key}
              >
                <img
                  alt=""
                  className="h-[54px] w-[54px] rounded-[9px] bg-[#f5f8fc] object-contain"
                  src={line.item.image}
                />
                <div className="min-w-0">
                  <strong className="block truncate text-sm">
                    {line.item.name}
                  </strong>
                  <span className="block text-xs text-[#64748b]">
                    {line.variant?.label ? `${line.variant.label} · ` : ""}Qty{" "}
                    {line.quantity}
                  </span>
                </div>
                <strong className="text-sm">
                  {peso.format(
                    itemPrice(line.item, line.variant) * line.quantity,
                  )}
                </strong>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-2 border-t border-[#dfe7f1] pt-4 text-sm">
            <SummaryLine label="Subtotal" value={peso.format(subtotal)} />
            {discount ? (
              <SummaryLine
                label="Voucher"
                value={discount ? `-${peso.format(discount)}` : "None"}
              />
            ) : null}
            {shipping ? (
              <SummaryLine
                label="Delivery Fee"
                value={shipping ? peso.format(shipping) : "Free"}
              />
            ) : null}
            <SummaryLine label="Total" strong value={peso.format(total)} />
          </div>
        </>
      )}
    </aside>
  );
}

function VoucherBox({
  appliedVoucher,
  error,
  onApply,
  onChange,
  onRemove,
  value,
}: {
  appliedVoucher?: Voucher;
  error: string;
  onApply: () => void;
  onChange: (value: string) => void;
  onRemove: () => void;
  value: string;
}) {
  return (
    <div className="mt-5 rounded-[14px] border border-[#dfe7f1] p-4">
      <strong className="block text-sm text-[#111827]">Voucher</strong>
      {appliedVoucher ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-[10px] bg-[#eff6ff] p-3 text-sm">
          <span>
            <strong>{appliedVoucher.code}</strong>
            <span className="block text-[#64748b]">{appliedVoucher.label}</span>
          </span>
          <button
            className="font-extrabold text-[#c0392b]"
            type="button"
            onClick={onRemove}
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-[9px] border border-[#cbd5e1] px-3"
              onChange={(event) => onChange(event.target.value)}
              placeholder="PTCARE10"
              value={value}
            />
            <button className={secondaryButton} type="button" onClick={onApply}>
              Apply
            </button>
          </div>
          {error && <small className="text-[#c0392b]">{error}</small>}
        </div>
      )}
    </div>
  );
}

function FulfillmentSelector({
  fulfillment,
  onChange,
}: {
  fulfillment: Fulfillment;
  onChange: (value: Fulfillment) => void;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-black">Delivery or pickup</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <OptionButton
          active={fulfillment === "delivery"}
          icon={<Truck className="h-5 w-5" />}
          label="Delivery"
          onClick={() => onChange("delivery")}
          text={`Send items to an address. Delivery fee is ${peso.format(config.deliveryFee)}.`}
        />
        <OptionButton
          active={fulfillment === "pickup"}
          icon={<Store className="h-5 w-5" />}
          label="Pickup"
          onClick={() => onChange("pickup")}
          text="Claim items at the center."
        />
      </div>
    </section>
  );
}

function DeliveryFields({
  fields,
  onChange,
}: {
  fields: CheckoutFields;
  onChange: (field: keyof CheckoutFields, value: string) => void;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
        <MapPin aria-hidden="true" className="h-5 w-5 text-[#0a388f]" />
        Delivery address
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Recipient name"
          value={fields.recipient}
          onChange={(value) => onChange("recipient", value)}
        />
        <Field
          label="Phone number"
          type="tel"
          value={fields.phone}
          onChange={(value) => onChange("phone", value)}
        />
        <Field
          label="Street / building / unit"
          wide
          value={fields.address}
          onChange={(value) => onChange("address", value)}
        />
        <Field
          label="City"
          value={fields.city}
          onChange={(value) => onChange("city", value)}
        />
        <Field
          label="Province"
          value={fields.province}
          onChange={(value) => onChange("province", value)}
        />
        <Field
          label="Postal code"
          value={fields.postalCode}
          onChange={(value) => onChange("postalCode", value)}
        />
      </div>
    </section>
  );
}

function PaymentSelector({
  payment,
  onChange,
}: {
  payment: Payment;
  onChange: (value: Payment) => void;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-black">Payment method</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <OptionButton
          active={payment === "cod"}
          icon={<Banknote className="h-5 w-5" />}
          label="COD"
          onClick={() => onChange("cod")}
          text="Pay in cash on delivery or pickup."
        />
        <OptionButton
          active={payment === "card"}
          icon={<CreditCard className="h-5 w-5" />}
          label="Card"
          onClick={() => onChange("card")}
          text="Mock card payment details."
        />
        <OptionButton
          active={payment === "qrph"}
          icon={<QrCode className="h-5 w-5" />}
          label="QRPh"
          onClick={() => onChange("qrph")}
          text="Scan a mock QRPh code."
        />
        <OptionButton
          active={payment === "gcash"}
          icon={<Smartphone className="h-5 w-5" />}
          label="GCash"
          onClick={() => onChange("gcash")}
          text="Pay using mock GCash instructions."
        />
      </div>
    </section>
  );
}

function PaymentPanel({
  fields,
  onChange,
  payment,
}: {
  fields: CheckoutFields;
  onChange: (field: keyof CheckoutFields, value: string) => void;
  payment: Payment;
}) {
  if (payment === "card") {
    return (
      <section className="rounded-[14px] border border-[#dfe7f1] p-4">
        <h3 className="mb-3 flex items-center gap-2 font-black">
          <CreditCard aria-hidden="true" className="h-5 w-5 text-[#0a388f]" />
          Card details
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Name on card"
            wide
            value={fields.cardName}
            onChange={(value) => onChange("cardName", value)}
          />
          <Field
            label="Card number"
            wide
            value={fields.cardNumber}
            onChange={(value) => onChange("cardNumber", value)}
          />
          <Field
            label="Expiry"
            value={fields.expiry}
            onChange={(value) => onChange("expiry", value)}
          />
          <Field
            label="CVC"
            value={fields.cvc}
            onChange={(value) => onChange("cvc", value)}
          />
        </div>
      </section>
    );
  }

  const content = {
    cod: {
      icon: <Banknote className="h-6 w-6" />,
      title: "Cash on delivery",
      text: "Prepare the exact amount when the items are delivered or picked up.",
    },
    qrph: {
      icon: <QrCode className="h-6 w-6" />,
      title: "QRPh",
      text: "A mock QRPh code will be shown by the clinic after order confirmation.",
    },
    gcash: {
      icon: <Wallet className="h-6 w-6" />,
      title: "GCash",
      text: "A mock GCash payment instruction will be sent after order confirmation.",
    },
  }[payment];

  return (
    <section className="rounded-[14px] border border-[#dfe7f1] bg-[#f8fbff] p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-[10px] bg-white text-[#0a388f]">
          {content.icon}
        </span>
        <div>
          <strong className="block text-[#111827]">{content.title}</strong>
          <p className="m-0 text-sm text-[#64748b]">{content.text}</p>
        </div>
      </div>
    </section>
  );
}

function ReviewPanel({
  discount,
  fulfillment,
  payment,
  shipping,
  subtotal,
  total,
}: {
  discount: number;
  fulfillment: Fulfillment;
  payment: Payment;
  shipping: number;
  subtotal: number;
  total: number;
}) {
  return (
    <section className="rounded-[14px] border border-[#dfe7f1] bg-[#f8fbff] p-4">
      <h2 className="mb-3 text-lg font-black">Confirm order</h2>
      <div className="grid gap-2 text-sm">
        <SummaryLine
          label="Fulfillment"
          value={fulfillment === "delivery" ? "Delivery" : "Pickup"}
        />
        <SummaryLine label="Payment" value={paymentLabel(payment)} />
        <SummaryLine label="Subtotal" value={peso.format(subtotal)} />
        <SummaryLine
          label="Voucher"
          value={discount ? `-${peso.format(discount)}` : "None"}
        />
        <SummaryLine
          label="Delivery / pickup"
          value={shipping ? peso.format(shipping) : "Free"}
        />
        <SummaryLine label="Total" strong value={peso.format(total)} />
      </div>
    </section>
  );
}

function OptionButton({
  active,
  icon,
  label,
  onClick,
  text,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  text: string;
}) {
  return (
    <button
      className={
        active
          ? "rounded-[14px] border border-[#0a388f] bg-[#eff6ff] p-4 text-left text-[#0a388f]"
          : "rounded-[14px] border border-[#dfe7f1] p-4 text-left text-[#111827] hover:bg-[#f5f8fc]"
      }
      onClick={onClick}
      type="button"
    >
      <span className="mb-3 inline-flex">{icon}</span>
      <strong className="block">{label}</strong>
      <span className="mt-1 block text-sm text-[#64748b]">{text}</span>
    </button>
  );
}

function Field({
  label,
  onChange,
  type = "text",
  value,
  wide,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <label
      className={
        wide
          ? "grid gap-1.5 text-xs font-extrabold text-[#334155] sm:col-span-2"
          : "grid gap-1.5 text-xs font-extrabold text-[#334155]"
      }
    >
      {label}
      <input
        className="h-11 rounded-[9px] border border-[#cbd5e1] px-3"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SubmittingState() {
  return (
    <div className="grid min-h-[460px] place-items-center text-center">
      <div>
        <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-[#dceaff] border-t-[#0a388f]" />
        <h2 className="mt-5 text-2xl font-black tracking-tight">
          Placing mock order
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#64748b]">
          Preparing the product order summary.
        </p>
      </div>
    </div>
  );
}

function Confirmation({
  fulfillment,
  orderId,
  payment,
  total,
}: {
  fulfillment: Fulfillment;
  orderId: string;
  payment: Payment;
  total: number;
}) {
  return (
    <div className="grid min-h-[460px] place-items-center text-center">
      <div className="w-full max-w-xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#dff8ee] text-[#0c6d4a]">
          <Package aria-hidden="true" className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-3xl font-black tracking-tight">
          Order Confirmed
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748b]">
          If there is anything else, contact us. Thank you for choosing
          PhysiCare Therapy Wellneess Center.
        </p>
        <div className="mx-auto mt-5 max-w-sm rounded-[14px] bg-[#eff6ff] p-4">
          <span className="text-xs font-extrabold uppercase tracking-[.08em] text-[#64748b]">
            Order number
          </span>
          <strong className="mt-1 block text-2xl tracking-wide text-[#0a388f]">
            {orderId}
          </strong>
        </div>
        <dl className="mt-6 grid gap-3 rounded-[14px] border border-[#dfe7f1] p-4 text-left text-sm">
          <SummaryLine
            label="Fulfillment"
            value={fulfillment === "delivery" ? "Delivery" : "Pickup"}
          />
          <SummaryLine label="Payment" value={paymentLabel(payment)} />
          <SummaryLine label="Total" value={peso.format(total)} />
        </dl>
        <Link
          className="mt-6 inline-flex font-extrabold text-[#0a388f]"
          href="/"
        >
          Back to products
        </Link>
      </div>
    </div>
  );
}

function paymentLabel(payment: Payment): string {
  return {
    cod: "Cash on delivery",
    card: "Card",
    qrph: "QRPh",
    gcash: "GCash",
  }[payment];
}

function SummaryLine({
  label,
  strong,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div
      className={
        strong
          ? "flex justify-between text-base font-black text-[#111827]"
          : "flex justify-between text-[#64748b]"
      }
    >
      <span>{label}</span>
      <strong className="text-[#111827]">{value}</strong>
    </div>
  );
}
