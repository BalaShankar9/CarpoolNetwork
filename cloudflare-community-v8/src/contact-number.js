import {parsePhoneNumberFromString} from 'libphonenumber-js/max';

export function whatsappNumber(input){
  const raw=String(input||'').trim();
  if(!/^\+[1-9][0-9 ()-]{5,24}$/.test(raw))throw Error('Enter your WhatsApp number with its country code, for example +44 7700 900123.');
  const number=parsePhoneNumberFromString(raw);
  if(!number?.isValid()||number.ext)throw Error('Check the country code and WhatsApp number.');
  return number.number;
}
