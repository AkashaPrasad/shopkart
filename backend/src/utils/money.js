// Formats integer paise as rupees: 4900 -> "₹49", 4950 -> "₹49.50".
export const formatINR = (paise) => {
  const rupees = paise / 100;
  return Number.isInteger(rupees) ? `₹${rupees}` : `₹${rupees.toFixed(2)}`;
};
