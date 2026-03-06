import express from 'express'
import multer from 'multer'
import mongoose from 'mongoose'
import { createAudioRecord } from '../models/audio.js'
import { analyzeAudioForAI } from '../services/audio_service.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

// upload raw audio; returns metadata including AI flag
router.post('/test', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'No audio file provided' })
    }

    const { buffer, mimetype } = req.file
    const filename = req.body.filename || `${Date.now()}`

    // store in GridFS
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'audios',
    })

    const uploadStream = bucket.openUploadStream(filename, { contentType: mimetype })
    uploadStream.end(buffer)

    uploadStream.on('finish', async () => {
      const fileId = uploadStream.id
      const aiDetected = await analyzeAudioForAI(buffer)

      // save metadata record
      const record = await createAudioRecord({
        file_id: fileId,
        ai_detected: aiDetected,
      })

      res.json({ fileId, aiDetected, recordId: record._id })
    })

    uploadStream.on('error', (err) => {
      console.error('GridFS upload error', err)
      res.status(500).json({ detail: 'Failed to save audio' })
    })
  } catch (err) {
    console.error('audio upload error', err)
    res.status(500).json({ detail: 'Server error' })
  }
})

// metadata lookup
router.get('/:id', async (req, res) => {
  try {
    const { getAudioById } = await import('../models/audio.js')
    const record = await getAudioById(req.params.id)
    if (!record) return res.status(404).json({ detail: 'Not found' })
    res.json(record)
  } catch (err) {
    console.error('audio metadata error', err)
    res.status(500).json({ detail: 'Server error' })
  }
})

// download raw audio file by GridFS id
router.get('/file/:fileId', async (req, res) => {
  try {
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'audios',
    })
    const _id = new mongoose.Types.ObjectId(req.params.fileId)
    const downloadStream = bucket.openDownloadStream(_id)
    downloadStream.on('error', (err) => {
      res.status(404).json({ detail: 'File not found' })
    })
    downloadStream.pipe(res)
  } catch (err) {
    console.error('audio file error', err)
    res.status(500).json({ detail: 'Server error' })
  }
})

export default router
