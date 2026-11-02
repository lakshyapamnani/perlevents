/**
 * Utility functions for currency, dates, and WhatsApp integration
 */

export const formatCurrency = (amount: number, symbol: string = '₹'): string => {
  return `${symbol}${amount.toLocaleString('en-IN')}`;
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const formatDateTime = (isoStr: string): string => {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
};

/**
 * Normalizes phone number to international format for WhatsApp click-to-chat.
 * E.g., "+91 98765 43210" -> "919876543210"
 */
export const cleanPhoneForWhatsApp = (phone: string): string => {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
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

This is an operational reminder from PerlEvents regarding the upcoming event at *${params.banquetName}*.

• *Event:* ${params.eventName}
• *Date:* ${params.date}
• *Time:* ${params.startTime} - ${params.endTime}
• *Venue:* ${params.banquetName}

*Venue Preparation Requirements:*
${params.requirements || 'Standard venue readiness, HVAC pre-cooling, and parking setup.'}

Please confirm venue readiness and gate opening schedule.

Thank you,
PerlEvents Operations (Powered by Drona)`;
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

This is a reminder from PerlEvents regarding your *${params.category}* service assignment at *${params.banquetName}*.

• *Event:* ${params.eventName}
• *Date:* ${params.date}
• *Time:* ${params.startTime} - ${params.endTime}
• *Venue:* ${params.banquetName}

*Your Service Requirements:*
${params.requirements || 'As per contractual agreement.'}

Please confirm your team's arrival time and readiness.

Thank you,
PerlEvents Operations (Powered by Drona)`;
};
