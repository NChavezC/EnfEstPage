import { useEffect, useState } from "react";

export default function ImageCarousel({
  images = [],
  autoPlayInterval = 5000,
  className = "",
  ariaLabel = "Galería de tratamientos estéticos",
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const imageCount = images.length;

  useEffect(() => {
    if (currentIndex >= imageCount) {
      setCurrentIndex(0);
    }
  }, [currentIndex, imageCount]);

  useEffect(() => {
    if (isPaused || imageCount <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setCurrentIndex((previousIndex) => {
        return (previousIndex + 1) % imageCount;
      });
    }, autoPlayInterval);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoPlayInterval, imageCount, isPaused]);

  const showPreviousImage = () => {
    if (imageCount <= 1) return;

    setCurrentIndex((previousIndex) => {
      return (previousIndex - 1 + imageCount) % imageCount;
    });
  };

  const showNextImage = () => {
    if (imageCount <= 1) return;

    setCurrentIndex((previousIndex) => {
      return (previousIndex + 1) % imageCount;
    });
  };

  const showImage = (index) => {
    setCurrentIndex(index);
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowLeft") {
      showPreviousImage();
    }

    if (event.key === "ArrowRight") {
      showNextImage();
    }
  };

  const handleBlur = (event) => {
    const nextFocusedElement = event.relatedTarget;

    if (!event.currentTarget.contains(nextFocusedElement)) {
      setIsPaused(false);
    }
  };

  if (imageCount === 0) {
    return (
      <div
        className={`flex h-[420px] w-full items-center justify-center rounded-2xl bg-[var(--color-surface-soft)] ${className}`}
      >
        <p className="px-6 text-center text-sm text-[var(--color-muted)]">
          No hay imágenes disponibles.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative h-[420px] w-full overflow-hidden rounded-2xl bg-[var(--color-surface-soft)] ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={handleBlur}
    >
      {/* Slides */}
      {images.map((image, index) => {
        const isCurrentImage = index === currentIndex;

        return (
          <div
            key={`${image.src}-${index}`}
            className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${
              isCurrentImage
                ? "z-10 opacity-100"
                : "pointer-events-none z-0 opacity-0"
            }`}
            aria-hidden={!isCurrentImage}
          >
            <img
              src={image.src}
              alt={image.alt ?? ""}
              className="h-full w-full object-cover"
              loading={index === 0 ? "eager" : "lazy"}
            />

            {image.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-6 pb-12 pt-16">
                <p className="text-center text-sm font-medium text-white">
                  {image.caption}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {imageCount > 1 && (
        <>
          {/* Previous button */}
          <button
            type="button"
            onClick={showPreviousImage}
            className="absolute left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black/55 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Mostrar imagen anterior"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Next button */}
          <button
            type="button"
            onClick={showNextImage}
            className="absolute right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black/55 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Mostrar imagen siguiente"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6"
            >
              <path
                d="M9 6L15 12L9 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Indicators */}
          <div
            className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-full bg-black/25 px-3 py-2 backdrop-blur-sm"
            role="tablist"
            aria-label="Seleccionar imagen"
          >
            {images.map((image, index) => {
              const isCurrentImage = index === currentIndex;

              return (
                <button
                  key={`indicator-${image.src}-${index}`}
                  type="button"
                  onClick={() => showImage(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    isCurrentImage
                      ? "w-7 bg-white"
                      : "w-2.5 bg-white/55 hover:bg-white/80"
                  }`}
                  aria-label={`Mostrar imagen ${index + 1} de ${imageCount}`}
                  aria-selected={isCurrentImage}
                  role="tab"
                />
              );
            })}
          </div>

          {/* Screen-reader position */}
          <p className="sr-only" aria-live="polite">
            Imagen {currentIndex + 1} de {imageCount}
          </p>
        </>
      )}
    </div>
  );
}
