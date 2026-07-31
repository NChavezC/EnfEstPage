function Logo() {
  return (
    <div className="flex w-full shrink-0 items-center justify-center">
      {/* Smartphone / small screens */}
      <img
        src="/logo-new-rosa.jpeg"
        alt="Enfermera Estética"
        className="h-20 w-auto shrink-0 object-contain md:hidden"
      />

      {/* Tablets, laptops and larger screens */}
      <img
        src="/logo-new-largo-rosa.jpeg"
        alt="Enfermera Estética"
        className="hidden h-20 w-auto shrink-0 object-contain md:block"
      />
    </div>
  );
}

export default Logo;
