"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Banknote,
  LockKeyhole,
  MapPin,
  Package,
  ReceiptText,
  ShieldCheck,
  Store,
  Truck,
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
type CheckoutErrors = Partial<Record<keyof CheckoutFields, string>>;
type TouchedFields = Partial<Record<keyof CheckoutFields, boolean>>;

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

function voucherAdjustment(subtotal: number, voucher?: Voucher): number {
  if (!voucher) return 0;
  const adjustment =
    voucher.type === "percentage"
      ? subtotal * (voucher.value / 100)
      : voucher.value;
  return Math.max(-subtotal, adjustment);
}

function formatAdjustment(value: number): string {
  if (value < 0) return `-${peso.format(Math.abs(value))}`;
  if (value > 0) return `+${peso.format(value)}`;
  return "None";
}

function validateDeliveryFields(fields: CheckoutFields): CheckoutErrors {
  return {
    recipient:
      fields.recipient.trim().length > 1
        ? undefined
        : "Enter the recipient name.",
    phone:
      fields.phone.trim().length > 6
        ? undefined
        : "Enter a valid phone number.",
    address:
      fields.address.trim().length > 4
        ? undefined
        : "Enter the delivery address.",
    city: fields.city.trim().length > 1 ? undefined : "Enter the city.",
    province:
      fields.province.trim().length > 1 ? undefined : "Enter the province.",
    postalCode:
      fields.postalCode.trim().length > 2
        ? undefined
        : "Enter the postal code.",
  };
}

function validateCardFields(fields: CheckoutFields): CheckoutErrors {
  return {
    cardName:
      fields.cardName.trim().length > 1 ? undefined : "Enter the name on card.",
    cardNumber:
      fields.cardNumber.replace(/\D/g, "").length >= 13
        ? undefined
        : "Enter a valid card number.",
    expiry:
      fields.expiry.trim().length >= 4 ? undefined : "Enter the expiry date.",
    cvc: fields.cvc.trim().length >= 3 ? undefined : "Enter the CVC.",
  };
}

function visibleErrors(
  errors: CheckoutErrors,
  touched: TouchedFields,
  showAll: boolean,
): CheckoutErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(
      ([field, error]) =>
        error && (showAll || touched[field as keyof CheckoutFields]),
    ),
  ) as CheckoutErrors;
}

export function CheckoutPageClient() {
  const [cart, setCart] = useState<CheckoutLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState<CheckoutStep>("fulfillment");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [payment, setPayment] = useState<Payment>("cod");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherError, setVoucherError] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | undefined>();
  const [touchedFields, setTouchedFields] = useState<TouchedFields>({});
  const [attemptedSteps, setAttemptedSteps] = useState<
    Partial<Record<CheckoutStep, boolean>>
  >({});
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
  const paymentLoadingTimer = useRef<number | undefined>(undefined);

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

  useEffect(() => {
    return () => {
      if (paymentLoadingTimer.current) {
        window.clearTimeout(paymentLoadingTimer.current);
      }
    };
  }, []);

  const cartCount = cart.reduce((total, line) => total + line.quantity, 0);
  const subtotal = cart.reduce(
    (total, line) => total + itemPrice(line.item, line.variant) * line.quantity,
    0,
  );
  const voucherAdjustmentAmount = voucherAdjustment(subtotal, appliedVoucher);
  const shipping =
    fulfillment === "delivery" && cart.length > 0 ? config.deliveryFee : 0;
  const total = Math.max(0, subtotal + voucherAdjustmentAmount) + shipping;
  const deliveryValid =
    fulfillment === "pickup" ||
    Object.values(validateDeliveryFields(fields)).every((error) => !error);
  const cardValid =
    payment !== "card" ||
    Object.values(validateCardFields(fields)).every((error) => !error);
  const deliveryErrors = visibleErrors(
    validateDeliveryFields(fields),
    touchedFields,
    Boolean(attemptedSteps.address),
  );
  const cardErrors = visibleErrors(
    validateCardFields(fields),
    touchedFields,
    Boolean(attemptedSteps.payment),
  );
  const steps: CheckoutStep[] =
    fulfillment === "delivery"
      ? ["fulfillment", "address", "payment", "review", "confirmation"]
      : ["fulfillment", "payment", "review", "confirmation"];
  const stepIndex = steps.indexOf(step);
  const canContinue =
    (step === "fulfillment" && cart.length > 0) ||
    (step === "address" && deliveryValid) ||
    (step === "payment" && cardValid && !paymentLoading) ||
    step === "review";

  function updateField(field: keyof CheckoutFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setTouchedFields((current) => ({ ...current, [field]: true }));
  }

  function goNext() {
    if (!canContinue) {
      setAttemptedSteps((current) => ({ ...current, [step]: true }));
      return;
    }
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

  function choosePayment(value: Payment) {
    if (value === payment) return;
    if (paymentLoadingTimer.current) {
      window.clearTimeout(paymentLoadingTimer.current);
    }
    setPayment(value);
    setPaymentLoading(true);
    paymentLoadingTimer.current = window.setTimeout(() => {
      setPaymentLoading(false);
    }, 520);
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
          discount={voucherAdjustmentAmount}
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
                <DeliveryFields
                  errors={deliveryErrors}
                  fields={fields}
                  onChange={updateField}
                />
              )}

              {step === "payment" && (
                <>
                  <PaymentSelector payment={payment} onChange={choosePayment} />
                  <SecurePaymentBadge />
                  {paymentLoading ? (
                    <PaymentLoadingPanel />
                  ) : (
                    <>
                      <PaymentPanel
                        errors={cardErrors}
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
                </>
              )}

              {step === "review" && (
                <ReviewPanel
                  fulfillment={fulfillment}
                  payment={payment}
                  shipping={shipping}
                  subtotal={subtotal}
                  discount={voucherAdjustmentAmount}
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
                label={discount < 0 ? "Voucher discount" : "Voucher adjustment"}
                value={formatAdjustment(discount)}
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
  errors,
  fields,
  onChange,
}: {
  errors: CheckoutErrors;
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
          error={errors.recipient}
          label="Recipient name"
          value={fields.recipient}
          onChange={(value) => onChange("recipient", value)}
        />
        <Field
          error={errors.phone}
          label="Phone number"
          type="tel"
          value={fields.phone}
          onChange={(value) => onChange("phone", value)}
        />
        <Field
          error={errors.address}
          label="Street / building / unit"
          wide
          value={fields.address}
          onChange={(value) => onChange("address", value)}
        />
        <Field
          error={errors.city}
          label="City"
          value={fields.city}
          onChange={(value) => onChange("city", value)}
        />
        <Field
          error={errors.province}
          label="Province"
          value={fields.province}
          onChange={(value) => onChange("province", value)}
        />
        <Field
          error={errors.postalCode}
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
        <PaymentOptionButton
          active={payment === "cod"}
          media={<Banknote className="h-9 w-9" />}
          label="COD"
          onClick={() => onChange("cod")}
          text="Pay in cash on delivery or pickup."
        />
        <PaymentOptionButton
          active={payment === "card"}
          media={<PaymentImage alt="" src="/images/cards.png" />}
          label="Card"
          onClick={() => onChange("card")}
          text="card payment details."
        />
        <PaymentOptionButton
          active={payment === "qrph"}
          media={<PaymentImage alt="" src="/images/qrph.webp" />}
          label="QRPh"
          onClick={() => onChange("qrph")}
          text="Scan a QRPh code."
        />
        <PaymentOptionButton
          active={payment === "gcash"}
          media={<PaymentImage alt="" src="/images/gcash.png" />}
          label="GCash"
          onClick={() => onChange("gcash")}
          text="Pay using GCash instructions."
        />
      </div>
    </section>
  );
}

function PaymentPanel({
  errors,
  fields,
  onChange,
  payment,
}: {
  errors: CheckoutErrors;
  fields: CheckoutFields;
  onChange: (field: keyof CheckoutFields, value: string) => void;
  payment: Payment;
}) {
  if (payment === "card") {
    return (
      <section className="overflow-hidden rounded-[16px] border border-[#dfe7f1] bg-white">
        <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-4 bg-[#f8fbff] p-4 sm:grid-cols-[150px_minmax(0,1fr)]">
          <span className="grid h-[104px] place-items-center overflow-hidden rounded-[14px] border border-[#dfe7f1] bg-white p-3 sm:h-[120px] sm:p-4">
            <img
              alt=""
              className="h-full max-h-[88px] w-full max-w-[120px] object-contain sm:max-h-[104px]"
              src="/images/cards.png"
            />
          </span>
          <div>
            <h3 className="font-black">Card details</h3>
            <p className="mt-1 text-sm leading-6 text-[#64748b]">
              Enter card information to continue this checkout preview.
            </p>
          </div>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field
            autoComplete="off"
            error={errors.cardName}
            label="Name on card"
            wide
            value={fields.cardName}
            onChange={(value) => onChange("cardName", value)}
          />
          <Field
            autoComplete="off"
            error={errors.cardNumber}
            inputMode="numeric"
            label="Card number"
            wide
            value={fields.cardNumber}
            onChange={(value) => onChange("cardNumber", value)}
          />
          <Field
            autoComplete="off"
            error={errors.expiry}
            label="Expiry"
            value={fields.expiry}
            onChange={(value) => onChange("expiry", value)}
          />
          <Field
            autoComplete="off"
            error={errors.cvc}
            inputMode="numeric"
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
      media: <Banknote className="h-12 w-12" />,
      title: "Cash on delivery",
      text: "Prepare the exact amount when the items are delivered or picked up.",
    },
    qrph: {
      media: (
        <img
          alt=""
          className="h-full max-h-[88px] w-full max-w-[120px] object-contain sm:max-h-[104px]"
          src="/images/qrph.webp"
        />
      ),
      title: "QRPh",
      text: "A QRPh code will be shown by the clinic after order confirmation.",
    },
    gcash: {
      media: (
        <img
          alt=""
          className="h-full max-h-[88px] w-full max-w-[120px] object-contain sm:max-h-[104px]"
          src="/images/gcash.png"
        />
      ),
      title: "GCash",
      text: "A GCash payment instruction will be sent after order confirmation.",
    },
  }[payment];

  return (
    <section className="rounded-[16px] border border-[#dfe7f1] bg-[#f8fbff] p-4">
      <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
        <span className="grid h-[104px] place-items-center overflow-hidden rounded-[14px] border border-[#dfe7f1] bg-white p-3 text-[#0a388f] sm:h-[120px] sm:p-4">
          {content.media}
        </span>
        <div>
          <strong className="block text-lg text-[#111827]">
            {content.title}
          </strong>
          <p className="m-0 mt-1 text-sm leading-6 text-[#64748b]">
            {content.text}
          </p>
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
          label={discount < 0 ? "Voucher discount" : "Voucher adjustment"}
          value={formatAdjustment(discount)}
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

function PaymentImage({ alt, src }: { alt: string; src: string }) {
  return (
    <span className="grid h-20 w-24 shrink-0 place-items-center rounded-[12px] border border-[#dfe7f1] bg-white p-3">
      <img alt={alt} className="h-full w-full object-contain" src={src} />
    </span>
  );
}

function PaymentOptionButton({
  active,
  label,
  media,
  onClick,
  text,
}: {
  active: boolean;
  label: string;
  media: React.ReactNode;
  onClick: () => void;
  text: string;
}) {
  return (
    <button
      className={
        active
          ? "grid min-h-[128px] grid-cols-[96px_minmax(0,1fr)] items-center gap-4 rounded-[16px] border border-[#0a388f] bg-[#eff6ff] p-4 text-left text-[#0a388f]"
          : "grid min-h-[128px] grid-cols-[96px_minmax(0,1fr)] items-center gap-4 rounded-[16px] border border-[#dfe7f1] bg-white p-4 text-left text-[#111827] hover:bg-[#f5f8fc]"
      }
      onClick={onClick}
      type="button"
    >
      <span className="grid h-20 w-24 place-items-center rounded-[12px] bg-white p-2 text-[#0a388f]">
        {media}
      </span>
      <span className="min-w-0">
        <strong className="block text-base">{label}</strong>
        <span className="mt-1 block text-sm leading-5 text-[#64748b]">
          {text}
        </span>
      </span>
    </button>
  );
}

function SecurePaymentBadge() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#d9efe5] bg-[#f2fbf7] p-3 text-sm text-[#0c6d4a]">
      <span className="inline-flex items-center gap-2 font-extrabold">
        <ShieldCheck aria-hidden="true" className="h-5 w-5" />
        Secure connection
      </span>
      <span className="inline-flex items-center gap-2 text-xs font-bold text-[#64748b]">
        <LockKeyhole aria-hidden="true" className="h-4 w-4" />
        encrypted checkout
      </span>
    </div>
  );
}

function PaymentLoadingPanel() {
  return (
    <section className="grid min-h-[186px] place-items-center rounded-[16px] border border-[#dfe7f1] bg-[#f8fbff] p-5 text-center">
      <div>
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#dceaff] border-t-[#0a388f]" />
        <strong className="mt-4 block text-[#111827]">
          Loading payment details
        </strong>
        <p className="mt-1 text-sm text-[#64748b]">
          Preparing the selected payment method.
        </p>
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
  autoComplete,
  error,
  inputMode,
  label,
  onChange,
  type = "text",
  value,
  wide,
}: {
  autoComplete?: string;
  error?: string;
  inputMode?: "decimal" | "email" | "numeric" | "search" | "tel" | "text" | "url";
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
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        className={
          error
            ? "h-11 rounded-[9px] border border-[#c0392b] bg-[#fff8f7] px-3 outline-none ring-2 ring-[#f8d8d2]"
            : "h-11 rounded-[9px] border border-[#cbd5e1] px-3"
        }
        inputMode={inputMode}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <small className="font-bold text-[#c0392b]">{error}</small>}
    </label>
  );
}

function SubmittingState() {
  return (
    <div className="grid min-h-[460px] place-items-center text-center">
      <div>
        <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-[#dceaff] border-t-[#0a388f]" />
        <h2 className="mt-5 text-2xl font-black tracking-tight">
          Placing order
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
