function Spinner() {
  return (
    <div
      className="flex h-full items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <svg
        className="h-32 w-32 animate-spin text-[var(--color-primary)]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />

        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v2a6 6 0 00-6 6H4z"
        />
      </svg>

      <span className="sr-only">Cargando...</span>
    </div>
  );
}

export default Spinner;
