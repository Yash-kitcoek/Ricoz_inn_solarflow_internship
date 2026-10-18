// Checks the file's first bytes, because the browser-supplied content type can be faked
export function looksLikeImage(buf) {
  if (buf.length < 12) return false
  const jpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff, png = buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  const webp = buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP'
  return jpg || png || webp
}
