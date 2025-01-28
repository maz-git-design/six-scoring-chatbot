import * as crypto from "crypto";

/**
 * Generate a random string of a specified length.
 * @param length - Optional length of the string to generate in bytes. Default is 8 bytes.
 * @returns A hexadecimal string of the specified length.
 */
const randHexStr = (length: number = 8): string => {
  // Generate a random byte buffer and convert it to a hex string
  return crypto.randomBytes(length).toString("hex");
};

export default randHexStr;
