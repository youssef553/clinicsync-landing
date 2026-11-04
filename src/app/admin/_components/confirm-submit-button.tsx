"use client";

export function ConfirmSubmitButton({
  children,
  confirmation,
}: {
  children: string;
  confirmation: string;
}) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(confirmation)) event.preventDefault();
      }}
      className="text-sm font-semibold text-rose-700 hover:text-rose-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
    >
      {children}
    </button>
  );
}
