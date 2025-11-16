// lib/pipeline.ts

import { callClaude, callGPT } from './ai-providers';

interface DocumentFormData {
  title: string;
  documentType: string;
  audience: string;
  seniority: string;
  knowledgeLevel: string;
  goal: string;
  goalTags: string[];
  keyPoints: string[];
  constraints: {
    mustInclude: string[];
    mustAvoid: string[];
    legalCompliance: string[];
  };
  evidence: string[];
  evidenceMode: string;
  length: {
    target: number;
    type: string;
    style: string;
  };
  tone: string;
  customTone: string;
  styleGuides: {
    oxfordComma: boolean;
    spelling: string;
    dateFormat: string;
    emojiPolicy: string;
  };
  privacyMode: boolean;
  reviewTargets: {
    readabilityGrade: number;
    clarityThreshold: number;
    flowThreshold: number;
  };
}

export async function runPipeline(
  title: string,
  formData?: DocumentFormData,
  onProgress?: (stage: string, content: string) => void
) {
  // Build comprehensive prompt based on form data
  const buildPrompt = (step: string, content?: string) => {
    let prompt = '';

    if (step === 'plan') {
      prompt = `Create a detailed outline for a ${formData?.documentType || 'document'} titled "${title}".`;

      if (formData) {
        prompt += `\n\nRequirements:
- Audience: ${formData.audience} (${formData.seniority} level, ${formData.knowledgeLevel} knowledge)
- Goal: ${formData.goal}
- Key Points: ${formData.keyPoints.join(', ')}
- Length: ${formData.length.target} ${formData.length.type} (${formData.length.style} style)
- Tone: ${formData.tone}${formData.tone === 'custom' ? ` (${formData.customTone})` : ''}
- Must Include: ${formData.constraints.mustInclude.join(', ')}
- Must Avoid: ${formData.constraints.mustAvoid.join(', ')}
- Evidence Mode: ${formData.evidenceMode}
- Readability Target: Grade ${formData.reviewTargets.readabilityGrade}`;
      }
    } else if (step === 'draft') {
      prompt = `Write a comprehensive draft ${formData?.documentType || 'document'} using this outline:\n\n${content}`;

      if (formData) {
        const lengthTarget = formData.length.target;
        const lengthType = formData.length.type;
        const lengthStyle = formData.length.style;

        prompt += `\n\nFollow these specifications:
- Length: EXACTLY ${lengthTarget} ${lengthType} (${lengthStyle} style) - This is critical and must be strictly adhered to
- Tone: ${formData.tone}${formData.tone === 'custom' ? ` (${formData.customTone})` : ''}
- Spelling: ${formData.styleGuides.spelling}
- Date Format: ${formData.styleGuides.dateFormat}
- Oxford Comma: ${formData.styleGuides.oxfordComma ? 'Yes' : 'No'}
- Emoji Policy: ${formData.styleGuides.emojiPolicy}
- Evidence: ${formData.evidence.join(', ')}
- Key Points: ${formData.keyPoints.join(', ')}
- Must Include: ${formData.constraints.mustInclude.join(', ')}
- Must Avoid: ${formData.constraints.mustAvoid.join(', ')}

IMPORTANT: The document must be exactly ${lengthTarget} ${lengthType}. Count your words/characters and adjust accordingly.`;
      }
    } else if (step === 'critique') {
      prompt = `Provide detailed critique and improvement suggestions for this draft:\n\n${content}`;

      if (formData && content) {
        const currentLength =
          formData.length.type === 'words'
            ? content.split(/\s+/).length
            : content.length;
        const targetLength = formData.length.target;

        prompt += `\n\nFocus on:
- Readability (target grade ${formData.reviewTargets.readabilityGrade})
- Clarity and flow
- Adherence to tone: ${formData.tone}
- Length appropriateness (current: ${currentLength} ${formData.length.type}, target: ${targetLength} ${formData.length.type})
- Inclusion of required elements: ${formData.constraints.mustInclude.join(', ')}
- Avoidance of restricted content: ${formData.constraints.mustAvoid.join(', ')}`;
      }
    } else if (step === 'refine') {
      prompt = `Refine this draft using the critique:\n\nDraft:\n${content}\n\nCritique:\n${formData?.constraints.mustInclude.join(', ') || 'N/A'}`;

      if (formData) {
        const targetLength = formData.length.target;
        const lengthType = formData.length.type;

        prompt += `\n\nEnsure the final version:
- Meets all original requirements
- Follows the specified tone and style
- Is appropriate for ${formData.audience} audience (${formData.seniority} level)
- Achieves the goal: ${formData.goal}
- Includes all key points: ${formData.keyPoints.join(', ')}
- Maintains EXACTLY ${targetLength} ${lengthType} length - This is critical
- Uses ${formData.styleGuides.spelling} spelling and ${formData.styleGuides.dateFormat} date format

CRITICAL: The final document must be exactly ${targetLength} ${lengthType}. Count and adjust as needed.`;
      }
    }

    return prompt;
  };

  // 🧭 Step 1 – Plan (Claude)
  console.log('🧭 Starting Plan stage...');
  const plan = await callClaude(buildPrompt('plan'));
  console.log('✅ Plan completed:', plan.substring(0, 100) + '...');
  onProgress?.('plan', plan);

  // 📝 Step 2 – Draft (GPT)
  console.log('📝 Starting Draft stage...');
  const draft = await callGPT(buildPrompt('draft', plan));
  console.log('✅ Draft completed:', draft.substring(0, 100) + '...');
  console.log(
    `📊 Draft word count: ${draft.split(/\s+/).length} words, ${draft.length} characters`
  );
  onProgress?.('draft', draft);

  // 🔍 Step 3 – Critique (Claude)
  console.log('🔍 Starting Critique stage...');
  const critique = await callClaude(buildPrompt('critique', draft));
  console.log('✅ Critique completed:', critique.substring(0, 100) + '...');
  onProgress?.('critique', critique);

  // ✨ Step 4 – Refine (GPT)
  console.log('✨ Starting Refine stage...');
  const refined = await callGPT(buildPrompt('refine', draft));
  console.log('✅ Refine completed:', refined.substring(0, 100) + '...');
  console.log(
    `📊 Final word count: ${refined.split(/\s+/).length} words, ${refined.length} characters`
  );
  onProgress?.('refined', refined);

  return { plan, draft, critique, refined };
}
