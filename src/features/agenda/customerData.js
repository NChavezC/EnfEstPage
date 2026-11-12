export const emptyCustomer = { first_name: "", last_name: "", birth_date: "", phone: "", email: "" };
export function customerPayload(customer) { return { ...customer, birth_date: customer.birth_date || null }; }
