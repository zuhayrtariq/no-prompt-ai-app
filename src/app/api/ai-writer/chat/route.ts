import { NextRequest } from 'next/server';
import { callClaude } from '@/lib/ai-providers';

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory } = await req.json();

    // Create a conversation context from history
    const context = conversationHistory
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Use Claude for more thoughtful responses
    const response = await callClaude(
      `You are an AI writing assistant. Help the user with their writing needs. Be helpful, creative, and provide specific suggestions.

Previous conversation:
${context}

User's current message: ${message}

Please provide a helpful response that assists with their writing needs.`
    );

    return Response.json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to process chat message'
      },
      { status: 500 }
    );
  }
}
