/**
 * Utility functions for Indian & International phone validation and normalization
 */

/**
 * Standardize an Indian mobile number to canonical format (+91XXXXXXXXXX)
 * @param {string} countryCode E.g. '+91'
 * @param {string} phoneNumber E.g. '9447726465' or '+91 94477 26465'
 * @returns {string} Normalized phone number E.g. '+919447726465'
 */
export function normalizePhone(countryCode = '+91', phoneNumber = '') {
  if (!phoneNumber) return '';
  const digits = String(phoneNumber).replace(/\D/g, '');
  
  if (countryCode === '+91' || countryCode === '91') {
    const last10 = digits.slice(-10);
    return `+91${last10}`;
  }
  
  return `${countryCode.startsWith('+') ? countryCode : `+${countryCode}`}${digits}`;
}

/**
 * Validates a mobile phone number based on country code.
 * For +91 (India): Strictly checks for exactly 10 digits starting with 6, 7, 8, or 9.
 * For other countries: Checks length between 8 and 15 digits.
 * @param {string} countryCode E.g. '+91'
 * @param {string} phoneNumber E.g. '9447726465'
 * @returns {{ isValid: boolean, message: string }}
 */
export function validatePhone(countryCode = '+91', phoneNumber = '') {
  if (!phoneNumber || String(phoneNumber).trim() === '') {
    return { isValid: false, message: 'Phone number is required.' };
  }

  const digits = String(phoneNumber).replace(/\D/g, '');

  if (countryCode === '+91' || countryCode === '91') {
    if (digits.length !== 10) {
      return { 
        isValid: false, 
        message: `Indian mobile number must be exactly 10 digits (you entered ${digits.length} digits).` 
      };
    }
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return { 
        isValid: false, 
        message: 'Indian mobile numbers must begin with 6, 7, 8, or 9.' 
      };
    }
    return { isValid: true, message: '' };
  }

  // International standard
  if (digits.length < 8 || digits.length > 15) {
    return { 
      isValid: false, 
      message: `Phone number must be between 8 and 15 digits (entered ${digits.length}).` 
    };
  }

  return { isValid: true, message: '' };
}

