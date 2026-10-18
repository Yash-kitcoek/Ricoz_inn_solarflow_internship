import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
export const uploadsRoot = path.resolve(env.UPLOAD_DIR)
// Files live outside any public folder and are only served through an authenticated route
export const evidenceUpload = multer({
  storage: multer.diskStorage({ destination: (req, file, cb) => { const dir = path.join(uploadsRoot, String(req.params.id)); fs.mkdirSync(dir, { recursive: true }); cb(null, dir) },
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + EXT[file.mimetype]) }),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => (EXT[file.mimetype] ? cb(null, true) : cb(new AppError(400, 'Upload a JPEG, PNG or WebP photo'))) }).single('photo')
