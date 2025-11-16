import { NextRequest } from 'next/server';
import { callClaude } from '@/lib/ai-providers';

export async function POST(req: NextRequest) {
  const { message, currentDocument, conversationHistory } = await req.json();

  try {
    // Create a prompt for document updating
    const prompt = `You are a document editing assistant. Your ONLY job is to modify the document based on the user's request. Do NOT ask questions or request clarification. Just make the requested changes.

CURRENT DOCUMENT:
${currentDocument}

USER REQUEST:
${message}

INSTRUCTIONS:
- Execute the user's request immediately without asking for clarification
- If they want to add a heading, add it at the top
- If they want to add content, expand the document naturally
- If they want to remove content, remove the appropriate sections
- If they want to modify content, make the changes while preserving quality
- Always maintain the document's professional tone and structure

RESPONSE FORMAT (JSON only):
{
  "explanation": "Brief description of what was changed",
  "updatedDocument": "The complete updated document with all changes applied"
}

Make the changes now and return the updated document.`;

    const response = await callClaude(prompt);

    // Try to parse the JSON response
    let parsedResponse;
    try {
      // Extract JSON from the response if it's wrapped in markdown
      const jsonMatch =
        response.match(/```json\n([\s\S]*?)\n```/) ||
        response.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;
      parsedResponse = JSON.parse(jsonString);
    } catch (parseError) {
      // If JSON parsing fails, try to extract just the document content
      const documentMatch =
        response.match(/updatedDocument["\s]*:["\s]*"([^"]+)"/) ||
        response.match(/updatedDocument["\s]*:["\s]*"([^"]*)"[\s\S]*?}/);

      if (documentMatch) {
        parsedResponse = {
          explanation: 'Document updated as requested',
          updatedDocument: documentMatch[1]
        };
      } else {
        // If all else fails, return the response as the updated document
        parsedResponse = {
          explanation: 'Document updated as requested',
          updatedDocument: response.replace(/```json|```/g, '').trim()
        };
      }
    }

    return Response.json({
      success: true,
      response: parsedResponse.explanation || response,
      updatedDocument: parsedResponse.updatedDocument || currentDocument,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to update document'
      },
      { status: 500 }
    );
  }
}
