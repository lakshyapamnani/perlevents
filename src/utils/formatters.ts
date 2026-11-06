/**
 * Utility functions for currency, dates, and WhatsApp integration
 */

export const formatCurrency = (amount?: number | null | string, symbol: string = '₹'): string => {
  if (amount === undefined || amount === null || amount === '') {
    return `${symbol}0`;
  }
  const numeric = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(numeric)) {
    return `${symbol}0`;
  }
  return `${symbol}${numeric.toLocaleString('en-IN')}`;
};

export const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
};

export const formatDateTime = (isoStr?: string | null): string => {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(isoStr);
  }
};

/**
 * Normalizes phone number to international format for WhatsApp click-to-chat.
 * E.g., "+91 98765 43210" -> "919876543210"
 */
export const cleanPhoneForWhatsApp = (phone?: string | null): string => {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    digits = `91${digits}`; // Default to India prefix if 10 digits
  }
  return digits;
};

/**
 * Generates a WhatsApp click-to-chat URL with prefilled message.
 */
export const generateWhatsAppUrl = (phone: string, message: string): string => {
  const cleanPhone = cleanPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};

/**
 * Generates WhatsApp reminder text for banquet owner.
 */
export const createBanquetOwnerReminderMessage = (params: {
  ownerName: string;
  banquetName: string;
  eventName: string;
  date: string;
  startTime: string;
  endTime: string;
  requirements: string;
}): string => {
  return `Hello ${params.ownerName},

This is an operational reminder from Pearlexperiences regarding the upcoming event at *${params.banquetName}*.

• *Event:* ${params.eventName}
• *Date:* ${params.date}
• *Time:* ${params.startTime} - ${params.endTime}
• *Venue:* ${params.banquetName}

*Venue Preparation Requirements:*
${params.requirements || 'Standard venue readiness, HVAC pre-cooling, and parking setup.'}

Please confirm venue readiness and gate opening schedule.

Thank you,
Pearlexperiences Operations Team`;
};

/**
 * Generates WhatsApp reminder text for a specific vendor.
 */
export const createVendorReminderMessage = (params: {
  vendorContactPerson: string;
  vendorBusinessName: string;
  category: string;
  banquetName: string;
  eventName: string;
  date: string;
  startTime: string;
  endTime: string;
  requirements: string;
}): string => {
  return `Hello ${params.vendorContactPerson || params.vendorBusinessName},

This is an operational reminder from Pearlexperiences regarding your *${params.category}* service assignment at *${params.banquetName}*.

• *Event:* ${params.eventName}
• *Date:* ${params.date}
• *Time:* ${params.startTime} - ${params.endTime}
• *Venue:* ${params.banquetName}

*Service Scope & Requirements:*
${params.requirements || 'As per contractual agreement.'}

Please confirm your team's arrival time and readiness.

Thank you,
Pearlexperiences Operations Team`;
};
