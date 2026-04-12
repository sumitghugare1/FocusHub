import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const VERSION = 's1'

export function hashRoomPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `${VERSION}$${salt.toString('hex')}$${hash.toString('hex')}`
}

export function verifyRoomPassword(password: string, storedHash: string | null): boolean {
  if (!storedHash) return false

  const [version, saltHex, hashHex] = storedHash.split('$')
  if (version !== VERSION || !saltHex || !hashHex) return false

  const salt = Buffer.from(saltHex, 'hex')
  const expectedHash = Buffer.from(hashHex, 'hex')
  const candidateHash = scryptSync(password, salt, expectedHash.length)

  return timingSafeEqual(candidateHash, expectedHash)
}
