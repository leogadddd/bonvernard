"use client";

import { useMemo, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import catalogData from "@/data/catalog.json";
import { SiteHeader } from "@/components/site-header";
import type { BookingType, CatalogItem } from "@/types/catalog";

const catalog = catalogData as CatalogItem[];
const services = catalog.filter((item) => item.type === "service");
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const primaryButton =
  "rounded-[10px] border-0 bg-gradient-to-br from-[#0a388f] to-[#2e73de] px-4 py-3 text-center font-extrabold text-white shadow-[0_8px_20px_rgba(11,67,173,.18)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none";
const secondaryButton =
  "rounded-[10px] border border-[#dfe7f1] px-4 py-3 text-center font-extrabold text-[#111827] transition hover:bg-[#f5f8fc] disabled:cursor-not-allowed disabled:opacity-45";

type Step = "consultation" | "details" | "schedule" | "notes" | "confirmation";
type AppointmentPeriod = "AM" | "PM" | "";
type BookingField = "fullName" | "phone" | "email" | "selectedDate" | "appointmentPeriod" | "acceptedTerms";
type BookingErrors = Partial<Record<BookingField, string>>;
type TouchedBookingFields = Partial<Record<BookingField, boolean>>;

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string): string {
  if (!value) return "Not selected";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function calendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: firstDay.getDay() }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) => new Date(year, month, index + 1),
    ),
  ];
}

function fullyBookedDateKeys(monthDate: Date): Set<string> {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const bookedDays = [3, 9, 14, 21, 27].filter((day) => day <= daysInMonth);
  return new Set(bookedDays.map((day) => dateKey(new Date(year, month, day))));
}

function createBookingId(): string {
  return `PHY-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function visibleErrors(
  errors: BookingErrors,
  touched: TouchedBookingFields,
  showAll: boolean,
): BookingErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(
      ([field, error]) => error && (showAll || touched[field as BookingField]),
    ),
  ) as BookingErrors;
}

export function BookingPageClient() {
  const searchParams = useSearchParams();
  const selectedService = useMemo(() => {
    const requestedService = searchParams.get("service");
    return (
      services.find((service) => service.id === requestedService) ?? services[0]
    );
  }, [searchParams]);
  const initialStep: Step = selectedService?.bookingTypes
    ? "consultation"
    : "details";

  const [step, setStep] = useState<Step>(initialStep);
  const [selectedBookingTypeId, setSelectedBookingTypeId] = useState(
    selectedService?.bookingTypes?.[0]?.id ?? "",
  );
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [appointmentMode, setAppointmentMode] = useState("In clinic");
  const [selectedDate, setSelectedDate] = useState("");
  const [appointmentPeriod, setAppointmentPeriod] =
    useState<AppointmentPeriod>("");
  const [notes, setNotes] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [touchedFields, setTouchedFields] = useState<TouchedBookingFields>({});
  const [attemptedSteps, setAttemptedSteps] = useState<
    Partial<Record<Step, boolean>>
  >({});

  const selectedBookingType =
    selectedService?.bookingTypes?.find(
      (type) => type.id === selectedBookingTypeId,
    ) ?? selectedService?.bookingTypes?.[0];

  const steps: Step[] = selectedService?.bookingTypes
    ? ["consultation", "details", "schedule", "notes", "confirmation"]
    : ["details", "schedule", "notes", "confirmation"];
  const stepIndex = steps.indexOf(step);
  const detailsErrors: BookingErrors = {
    fullName:
      fullName.trim().length > 1 ? undefined : "Enter your full name.",
    phone:
      phone.trim().length > 6 ? undefined : "Enter a valid phone number.",
    email: /^\S+@\S+\.\S+$/.test(email)
      ? undefined
      : "Enter a valid email address.",
  };
  const scheduleErrors: BookingErrors = {
    selectedDate: selectedDate ? undefined : "Choose an appointment date.",
    appointmentPeriod: appointmentPeriod
      ? undefined
      : "Choose AM or PM appointment.",
  };
  const notesErrors: BookingErrors = {
    acceptedTerms: acceptedTerms
      ? undefined
      : "Accept the appointment terms to continue.",
  };
  const shownDetailsErrors = visibleErrors(
    detailsErrors,
    touchedFields,
    Boolean(attemptedSteps.details),
  );
  const shownScheduleErrors = visibleErrors(
    scheduleErrors,
    touchedFields,
    Boolean(attemptedSteps.schedule),
  );
  const shownNotesErrors = visibleErrors(
    notesErrors,
    touchedFields,
    Boolean(attemptedSteps.notes),
  );
  const canContinue =
    (step === "consultation" && Boolean(selectedBookingType)) ||
    (step === "details" &&
      Object.values(detailsErrors).every((error) => !error)) ||
    (step === "schedule" &&
      Object.values(scheduleErrors).every((error) => !error)) ||
    (step === "notes" && Object.values(notesErrors).every((error) => !error));

  function markTouched(field: BookingField) {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  }

  function updateFullName(value: string) {
    setFullName(value);
    markTouched("fullName");
  }

  function updatePhone(value: string) {
    setPhone(value);
    markTouched("phone");
  }

  function updateEmail(value: string) {
    setEmail(value);
    markTouched("email");
  }

  function updateSelectedDate(value: string) {
    setSelectedDate(value);
    markTouched("selectedDate");
  }

  function updateAppointmentPeriod(value: AppointmentPeriod) {
    setAppointmentPeriod(value);
    markTouched("appointmentPeriod");
  }

  function updateAcceptedTerms(value: boolean) {
    setAcceptedTerms(value);
    markTouched("acceptedTerms");
  }

  function goNext() {
    if (!canContinue) {
      setAttemptedSteps((current) => ({ ...current, [step]: true }));
      return;
    }
    const nextStep = steps[stepIndex + 1];
    if (nextStep) setStep(nextStep);
  }

  function submitBooking() {
    if (!canContinue || submitting) {
      setAttemptedSteps((current) => ({ ...current, [step]: true }));
      return;
    }
    setSubmitting(true);
    window.setTimeout(() => {
      setBookingId(createBookingId());
      setSubmitting(false);
      setStep("confirmation");
    }, 900);
  }

  function goBack() {
    const previousStep = steps[stepIndex - 1];
    if (previousStep) setStep(previousStep);
  }

  return (
    <div className="min-h-screen bg-[#f5f8fc]">
      <SiteHeader />
      <main className="mx-auto grid w-[min(1080px,calc(100%-32px))] gap-6 py-10 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="self-start rounded-[18px] border border-[#dfe7f1] bg-white p-5">
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#111827]">
            {selectedService?.name ?? "Appointment"}
          </h1>
          {selectedService && (
            <div className="mt-6 rounded-[14px] bg-[#eff6ff] p-4">
              <div className="overflow-hidden rounded-xl border">
                <img
                  src={selectedService.image}
                  alt=""
                  className="mx-auto h-40 w-full object-contain mix-blend-multiply"
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-[#64748b]">
                {selectedService.description}
              </p>
            </div>
          )}
          <div className="mt-5 rounded-[14px] p-4 text-xs leading-6 text-[#64748b]">
            By booking, you agree that this request is for appointment review
            only and that PhysiCare Therapy Wellness Center may contact you to
            confirm details, availability, and follow-up instructions.
          </div>
        </aside>

        <section className="rounded-[18px] border border-[#dfe7f1] bg-white p-5 shadow-[0_18px_60px_rgba(13,49,101,.08)] sm:p-6">
          <div className="mb-6 flex flex-wrap gap-2">
            {steps.map((item, index) => (
              <span
                className={
                  index <= stepIndex
                    ? "rounded-full bg-[#0a388f] px-3 py-1 text-xs font-extrabold capitalize text-white"
                    : "rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-extrabold capitalize text-[#0a388f]"
                }
                key={item}
              >
                {index + 1}. {item}
              </span>
            ))}
          </div>

          {submitting ? (
            <SubmittingState />
          ) : step === "confirmation" ? (
            <Confirmation
              appointmentMode={appointmentMode}
              appointmentPeriod={appointmentPeriod}
              bookingId={bookingId}
              selectedBookingType={selectedBookingType}
              selectedDate={selectedDate}
              selectedService={selectedService}
            />
          ) : (
            <div className="grid gap-6">
              {step === "consultation" && selectedService?.bookingTypes && (
                <StepFrame eyebrow="Step 1" title="Choose consultation type">
                  <div className="grid gap-3">
                    {selectedService.bookingTypes.map((type) => (
                      <button
                        className={
                          selectedBookingTypeId === type.id
                            ? "rounded-[12px] border border-[#0a388f] bg-[#eff6ff] p-4 text-left font-extrabold text-[#0a388f]"
                            : "rounded-[12px] border border-[#dfe7f1] p-4 text-left font-extrabold text-[#111827] hover:bg-[#f5f8fc]"
                        }
                        key={type.id}
                        type="button"
                        onClick={() => setSelectedBookingTypeId(type.id)}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </StepFrame>
              )}

              {step === "details" && (
                <StepFrame eyebrow="Step 2" title="Request details">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      error={shownDetailsErrors.fullName}
                      label="Full name"
                      value={fullName}
                      onChange={updateFullName}
                    />
                    <Field
                      error={shownDetailsErrors.phone}
                      label="Phone number"
                      type="tel"
                      value={phone}
                      onChange={updatePhone}
                    />
                    <Field
                      error={shownDetailsErrors.email}
                      label="Email"
                      type="email"
                      value={email}
                      onChange={updateEmail}
                    />
                    <label className="grid gap-1.5 text-xs font-extrabold text-[#334155]">
                      Type of consultation
                      <select
                        className="h-11 rounded-[9px] border border-[#cbd5e1] px-3"
                        value={appointmentMode}
                        onChange={(event) =>
                          setAppointmentMode(event.target.value)
                        }
                      >
                        <option>In clinic</option>
                        <option>Online</option>
                        <option>Home care</option>
                      </select>
                    </label>
                  </div>
                </StepFrame>
              )}

              {step === "schedule" && (
                <StepFrame eyebrow="Step 3" title="Choose schedule">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,430px)_minmax(220px,1fr)] lg:items-start">
                    <CalendarPicker
                      monthDate={calendarMonth}
                      selectedDate={selectedDate}
                      onMonthChange={setCalendarMonth}
                      onSelectDate={updateSelectedDate}
                    />
                    <div className="grid gap-4">
                      <div className="rounded-[12px] border border-[#dfe7f1] bg-[#f8fbff] p-4 text-sm">
                        <span className="text-xs font-extrabold uppercase tracking-[.08em] text-[#64748b]">
                          Selected schedule
                        </span>
                        <strong className="mt-1 block text-[#111827]">
                          {selectedDate
                            ? formatDate(selectedDate)
                            : "Choose a date"}
                        </strong>
                        <span className="mt-1 block text-[#64748b]">
                          {appointmentPeriod
                            ? `${appointmentPeriod} appointment`
                            : "Choose AM or PM"}
                        </span>
                        {(shownScheduleErrors.selectedDate ||
                          shownScheduleErrors.appointmentPeriod) && (
                          <div className="mt-3 grid gap-1 text-xs font-bold text-[#c0392b]">
                            {shownScheduleErrors.selectedDate && (
                              <span>{shownScheduleErrors.selectedDate}</span>
                            )}
                            {shownScheduleErrors.appointmentPeriod && (
                              <span>{shownScheduleErrors.appointmentPeriod}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="grid gap-3">
                        {(["AM", "PM"] as const).map((period) => (
                          <button
                            className={
                              appointmentPeriod === period
                                ? "rounded-[12px] border border-[#0a388f] bg-[#eff6ff] p-3 font-extrabold text-[#0a388f]"
                                : "rounded-[12px] border border-[#dfe7f1] p-3 font-extrabold text-[#111827] hover:bg-[#f5f8fc]"
                            }
                            key={period}
                            type="button"
                            onClick={() => updateAppointmentPeriod(period)}
                          >
                            {period} appointment
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </StepFrame>
              )}

              {step === "notes" && (
                <StepFrame eyebrow="Step 4" title="Additional notes">
                  <div className="grid gap-4">
                    <label className="grid gap-1.5 text-xs font-extrabold text-[#334155]">
                      Notes
                      <textarea
                        className="min-h-36 rounded-[9px] border border-[#cbd5e1] p-3"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                      />
                    </label>
                    <label className="flex items-start gap-3 rounded-[12px] border border-[#dfe7f1] p-4 text-sm leading-6 text-[#64748b]">
                      <input
                        checked={acceptedTerms}
                        className="mt-1"
                        onChange={(event) =>
                          updateAcceptedTerms(event.target.checked)
                        }
                        type="checkbox"
                      />
                      <span>
                        I agree that submitting this request means I accept the
                        appointment terms and allow PhysiCare Therapy Wellness
                        Center to contact me about this booking.
                      </span>
                    </label>
                    {shownNotesErrors.acceptedTerms && (
                      <small className="font-bold text-[#c0392b]">
                        {shownNotesErrors.acceptedTerms}
                      </small>
                    )}
                  </div>
                </StepFrame>
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
                  onClick={
                    steps[stepIndex + 1] === "confirmation"
                      ? submitBooking
                      : goNext
                  }
                  type="button"
                >
                  {steps[stepIndex + 1] === "confirmation"
                    ? "Submit booking"
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

function StepFrame({
  children,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <span className="text-xs font-black uppercase tracking-[.13em] text-[#165bc8]">
        {eyebrow}
      </span>
      <h2 className="mt-1 text-2xl font-black tracking-tight">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({
  error,
  label,
  onChange,
  type = "text",
  value,
}: {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-extrabold text-[#334155]">
      {label}
      <input
        aria-invalid={Boolean(error)}
        className={
          error
            ? "h-11 rounded-[9px] border border-[#c0392b] bg-[#fff8f7] px-3 outline-none ring-2 ring-[#f8d8d2]"
            : "h-11 rounded-[9px] border border-[#cbd5e1] px-3"
        }
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <small className="font-bold text-[#c0392b]">{error}</small>}
    </label>
  );
}

function CalendarPicker({
  monthDate,
  onMonthChange,
  onSelectDate,
  selectedDate,
}: {
  monthDate: Date;
  onMonthChange: (date: Date) => void;
  onSelectDate: (value: string) => void;
  selectedDate: string;
}) {
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(monthDate);
  const bookedDates = fullyBookedDateKeys(monthDate);

  return (
    <div className="max-w-[430px] rounded-[14px] border border-[#dfe7f1] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          className="rounded-[8px] border border-[#dfe7f1] px-3 py-2 text-xs font-extrabold text-[#111827] transition hover:bg-[#f5f8fc]"
          type="button"
          onClick={() =>
            onMonthChange(
              new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1),
            )
          }
        >
          Prev
        </button>
        <strong className="text-base">{monthLabel}</strong>
        <button
          className="rounded-[8px] border border-[#dfe7f1] px-3 py-2 text-xs font-extrabold text-[#111827] transition hover:bg-[#f5f8fc]"
          type="button"
          onClick={() =>
            onMonthChange(
              new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1),
            )
          }
        >
          Next
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((day) => (
          <span className="text-xs font-extrabold text-[#64748b]" key={day}>
            {day}
          </span>
        ))}
        {calendarDays(monthDate).map((date, index) => {
          if (!date) return <span aria-hidden="true" key={`blank-${index}`} />;

          const key = dateKey(date);
          const fullyBooked = bookedDates.has(key);

          return (
            <button
              aria-label={
                fullyBooked
                  ? `${formatDate(key)} is fully booked`
                  : `Select ${formatDate(key)}`
              }
              className={
                fullyBooked
                  ? "h-9 cursor-not-allowed rounded-[8px] border border-[#dfe7f1] bg-[#f1f5f9] text-xs font-extrabold text-[#94a3b8] line-through"
                  : selectedDate === key
                    ? "h-9 rounded-[8px] bg-[#0a388f] text-xs font-extrabold text-white"
                    : "h-9 rounded-[8px] border border-[#dfe7f1] text-xs font-extrabold text-[#111827] hover:bg-[#eff6ff]"
              }
              disabled={fullyBooked}
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs font-extrabold text-[#64748b]">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-[#0a388f]" />
          Selected
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-[#dfe7f1] bg-[#f1f5f9]" />
          Fully booked
        </span>
      </div>
    </div>
  );
}

function SubmittingState() {
  return (
    <div className="grid min-h-[460px] place-items-center text-center">
      <div>
        <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-[#dceaff] border-t-[#0a388f]" />
        <h2 className="mt-5 text-2xl font-black tracking-tight">
          Submitting booking request
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#64748b]">
          Checking the selected schedule and preparing your booking ID.
        </p>
      </div>
    </div>
  );
}

function Confirmation({
  appointmentMode,
  appointmentPeriod,
  bookingId,
  selectedBookingType,
  selectedDate,
  selectedService,
}: {
  appointmentMode: string;
  appointmentPeriod: AppointmentPeriod;
  bookingId: string;
  selectedBookingType?: BookingType;
  selectedDate: string;
  selectedService?: CatalogItem;
}) {
  return (
    <div className="grid min-h-[460px] place-items-center">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#dff8ee] text-[#0c6d4a]">
          <CalendarCheck aria-hidden="true" className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-3xl font-black tracking-tight">
          Appointment Confirmed
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748b]">
          If there is anything else, contact us. Thank you for choosing
          PhysiCare Therapy Wellneess Center.
        </p>
        <div className="mx-auto mt-5 max-w-sm rounded-[14px] bg-[#eff6ff] p-4">
          <span className="text-xs font-extrabold uppercase tracking-[.08em] text-[#64748b]">
            Booking ID
          </span>
          <strong className="mt-1 block text-2xl tracking-wide text-[#0a388f]">
            {bookingId}
          </strong>
        </div>
        <dl className="mt-6 grid gap-3 rounded-[14px] border border-[#dfe7f1] p-4 text-left text-sm">
          <SummaryRow
            label="Service"
            value={selectedService?.name ?? "Appointment"}
          />
          {selectedBookingType && (
            <SummaryRow
              label="Consultation type"
              value={selectedBookingType.label}
            />
          )}
          <SummaryRow label="Type" value={appointmentMode} />
          <SummaryRow label="Date" value={formatDate(selectedDate)} />
          <SummaryRow label="Time" value={`${appointmentPeriod} appointment`} />
        </dl>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)]">
      <dt className="font-extrabold text-[#334155]">{label}</dt>
      <dd className="m-0 text-[#64748b]">{value}</dd>
    </div>
  );
}
