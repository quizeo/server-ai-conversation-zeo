import express from 'express';
import { handleConversation } from '../controllers/ai.controller.js';

const router = express.Router();

// Route to handle conversation with AI
router.post('/conversation', handleConversation);

export default router; 