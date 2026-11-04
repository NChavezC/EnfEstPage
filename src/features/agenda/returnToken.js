// The booking capability is always a 32-byte URL-safe token (43 characters).
const validToken = /^[A-Za-z0-9_-]{43}$/;
export function bookingReturnToken(pathToken, search, storedToken) {
  const params = new URLSearchParams(search);
  const candidate = pathToken || params.get("token");
  if (candidate) {
    if (validToken.test(candidate)) return candidate;
    // Compatibility with providers appending ?x_result=... to an existing query.
    const legacy = candidate.match(/^([A-Za-z0-9_-]{43})\?x_/);
    return legacy ? legacy[1] : null;
  }
  return validToken.test(storedToken || "") ? storedToken : null;
}
