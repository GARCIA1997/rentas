// Calculate suggested rent with 7% increase, rounded up to nearest 10
export const calculateSuggestedRent = (currentRent) => {
  const increased = Number(currentRent) * 1.07;
  // Round up to nearest 10
  return Math.ceil(increased / 10) * 10;
};

// Get the next occurrence of a given day of month after a reference date
// Used to calculate first payment date for renewed contracts
export const getNextPaymentDateFromDay = (referenceDate, paymentDay) => {
  const ref = new Date(referenceDate);
  const nextMonth = new Date(ref);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  nextMonth.setUTCDate(Math.min(paymentDay, 28)); // Cap at 28 to avoid month-end issues
  return nextMonth;
};

// Calculate contract renewal eligibility: must be ACTIVE and endDate within next 2 months
export const isContractRenewalEligible = (contract) => {
  if (contract.status !== 'ACTIVE') {
    return false;
  }

  const now = new Date();
  const twoMonthsFromNow = new Date();
  twoMonthsFromNow.setUTCMonth(twoMonthsFromNow.getUTCMonth() + 2);

  const endDate = new Date(contract.endDate);
  return endDate <= twoMonthsFromNow && endDate > now;
};
