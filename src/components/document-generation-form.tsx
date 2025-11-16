'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { X } from 'lucide-react';

interface DocumentFormData {
  // Basic Info
  title: string;
  documentType:
    | 'email'
    | 'legal-letter'
    | 'essay'
    | 'article'
    | 'report'
    | 'blog';

  // Audience & Goal
  audience: 'internal' | 'external';
  seniority: 'junior' | 'mid' | 'senior' | 'executive';
  knowledgeLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  goal: string;
  goalTags: string[];

  // Content
  keyPoints: string[];
  constraints: {
    mustInclude: string[];
    mustAvoid: string[];
    legalCompliance: string[];
  };

  // Evidence & References
  evidence: string[];
  evidenceMode: 'summary' | 'verbatim';

  // Formatting
  length: {
    target: number;
    type: 'words' | 'characters';
    style: 'tight' | 'medium' | 'long';
  };

  // Tone & Style
  tone:
    | 'plain'
    | 'formal'
    | 'friendly'
    | 'punchy'
    | 'neutral'
    | 'aussie'
    | 'us'
    | 'uk'
    | 'custom';
  customTone: string;
  styleGuides: {
    oxfordComma: boolean;
    spelling: 'au' | 'us' | 'uk';
    dateFormat: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';
    emojiPolicy: 'none' | 'minimal' | 'moderate' | 'liberal';
  };

  // Privacy & Review
  privacyMode: boolean;
  reviewTargets: {
    readabilityGrade: number;
    clarityThreshold: number;
    flowThreshold: number;
  };

  // Document-specific fields
  email?: {
    subType:
      | 'cold'
      | 'follow-up'
      | 'intro'
      | 'apology'
      | 'update'
      | 'meeting-request'
      | 'sales';
    subject: string;
    recipients: string[];
    context: string;
    ask: string;
    valueProps: string[];
    objections: string[];
    signOff: string;
    ps: string;
  };

  legalLetter?: {
    jurisdiction: string;
    matterType: 'demand' | 'notice' | 'engagement' | 'termination';
    partyDetails: {
      sender: string;
      recipient: string;
      refs: string;
      abnAcn: string;
    };
    facts: string;
    issues: string[];
    remedySought: string;
    legalBasis: string;
    deadlines: string;
    serviceMethod: 'email' | 'post';
  };

  essay?: {
    essayType: 'argumentative' | 'explanatory' | 'narrative' | 'reflective';
    workingThesis: string;
    audienceLevel: 'general' | 'technical';
    outline: string[];
    evidence: string[];
    counterArguments: string[];
    examples: string[];
    conclusionMoves: string[];
    voice: 'aussie-columnist' | 'academic-neutral' | 'op-ed-punchy';
  };
}

interface DocumentGenerationFormProps {
  onSubmit: (data: DocumentFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isReadOnly?: boolean;
  formData?: DocumentFormData | null;
}

export default function DocumentGenerationForm({
  onSubmit,
  onCancel,
  isLoading,
  isReadOnly = false,
  formData: initialFormData
}: DocumentGenerationFormProps) {
  const [formData, setFormData] = useState<DocumentFormData>(
    initialFormData || {
      title: '',
      documentType: 'article',
      audience: 'internal',
      seniority: 'mid',
      knowledgeLevel: 'intermediate',
      goal: '',
      goalTags: [],
      keyPoints: [],
      constraints: {
        mustInclude: [],
        mustAvoid: [],
        legalCompliance: []
      },
      evidence: [],
      evidenceMode: 'summary',
      length: {
        target: 500,
        type: 'words',
        style: 'medium'
      },
      tone: 'neutral',
      customTone: '',
      styleGuides: {
        oxfordComma: true,
        spelling: 'au',
        dateFormat: 'dd/mm/yyyy',
        emojiPolicy: 'minimal'
      },
      privacyMode: false,
      reviewTargets: {
        readabilityGrade: 8,
        clarityThreshold: 7,
        flowThreshold: 7
      }
    }
  );

  const [newKeyPoint, setNewKeyPoint] = useState('');
  const [newGoalTag, setNewGoalTag] = useState('');
  const [newMustInclude, setNewMustInclude] = useState('');
  const [newMustAvoid, setNewMustAvoid] = useState('');
  const [newEvidence, setNewEvidence] = useState('');

  const addKeyPoint = () => {
    if (newKeyPoint.trim()) {
      setFormData((prev) => ({
        ...prev,
        keyPoints: [...prev.keyPoints, newKeyPoint.trim()]
      }));
      setNewKeyPoint('');
    }
  };

  const removeKeyPoint = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      keyPoints: prev.keyPoints.filter((_, i) => i !== index)
    }));
  };

  const addGoalTag = () => {
    if (newGoalTag.trim()) {
      setFormData((prev) => ({
        ...prev,
        goalTags: [...prev.goalTags, newGoalTag.trim()]
      }));
      setNewGoalTag('');
    }
  };

  const removeGoalTag = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      goalTags: prev.goalTags.filter((_, i) => i !== index)
    }));
  };

  const addMustInclude = () => {
    if (newMustInclude.trim()) {
      setFormData((prev) => ({
        ...prev,
        constraints: {
          ...prev.constraints,
          mustInclude: [...prev.constraints.mustInclude, newMustInclude.trim()]
        }
      }));
      setNewMustInclude('');
    }
  };

  const removeMustInclude = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        mustInclude: prev.constraints.mustInclude.filter((_, i) => i !== index)
      }
    }));
  };

  const addMustAvoid = () => {
    if (newMustAvoid.trim()) {
      setFormData((prev) => ({
        ...prev,
        constraints: {
          ...prev.constraints,
          mustAvoid: [...prev.constraints.mustAvoid, newMustAvoid.trim()]
        }
      }));
      setNewMustAvoid('');
    }
  };

  const removeMustAvoid = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        mustAvoid: prev.constraints.mustAvoid.filter((_, i) => i !== index)
      }
    }));
  };

  const addEvidence = () => {
    if (newEvidence.trim()) {
      setFormData((prev) => ({
        ...prev,
        evidence: [...prev.evidence, newEvidence.trim()]
      }));
      setNewEvidence('');
    }
  };

  const removeEvidence = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      evidence: prev.evidence.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Helper to add disabled attribute to form elements
  const getDisabledProps = () => ({
    disabled: isReadOnly
  });

  return (
    <div className='mx-auto w-full max-w-7xl p-4'>
      <Card className='border-0 shadow-lg'>
        <CardHeader className='pb-4'>
          <CardTitle className='text-center text-2xl font-bold'>
            {isReadOnly
              ? 'Document Generation Parameters'
              : 'Advanced Document Generation'}
          </CardTitle>
          <p className='text-muted-foreground mt-2 text-center'>
            {isReadOnly
              ? 'View the parameters used to generate your document'
              : 'Configure all parameters for your document generation'}
          </p>
        </CardHeader>
        <CardContent className='px-4 pb-6 sm:px-6'>
          <form onSubmit={handleSubmit} className='space-y-6'>
            {/* Basic Information */}
            <div className='space-y-4'>
              <div className='border-b pb-2'>
                <h3 className='text-primary text-lg font-semibold'>
                  Basic Information
                </h3>
                <p className='text-muted-foreground text-sm'>
                  Document title and type
                </p>
              </div>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='title'>Document Title</Label>
                  <Input
                    id='title'
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value
                      }))
                    }
                    placeholder='Enter document title'
                    required
                    disabled={isReadOnly}
                  />
                </div>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='documentType'>Document Type</Label>
                  <Select
                    value={formData.documentType}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({ ...prev, documentType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='email'>Email</SelectItem>
                      <SelectItem value='legal-letter'>Legal Letter</SelectItem>
                      <SelectItem value='essay'>Essay</SelectItem>
                      <SelectItem value='article'>Article</SelectItem>
                      <SelectItem value='report'>Report</SelectItem>
                      <SelectItem value='blog'>Blog Post</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Audience & Goal */}
            <div className='space-y-4'>
              <div className='border-b pb-2'>
                <h3 className='text-primary text-lg font-semibold'>
                  Audience & Goal
                </h3>
                <p className='text-muted-foreground text-sm'>
                  Target audience and document objectives
                </p>
              </div>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='audience'>Audience</Label>
                  <Select
                    value={formData.audience}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({ ...prev, audience: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='internal'>Internal</SelectItem>
                      <SelectItem value='external'>External</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='seniority'>Seniority</Label>
                  <Select
                    value={formData.seniority}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({ ...prev, seniority: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='junior'>Junior</SelectItem>
                      <SelectItem value='mid'>Mid-level</SelectItem>
                      <SelectItem value='senior'>Senior</SelectItem>
                      <SelectItem value='executive'>Executive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='knowledgeLevel'>Knowledge Level</Label>
                  <Select
                    value={formData.knowledgeLevel}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({
                        ...prev,
                        knowledgeLevel: value
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='beginner'>Beginner</SelectItem>
                      <SelectItem value='intermediate'>Intermediate</SelectItem>
                      <SelectItem value='advanced'>Advanced</SelectItem>
                      <SelectItem value='expert'>Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='flex flex-col gap-2'>
                <Label htmlFor='goal'>Goal</Label>
                <Textarea
                  id='goal'
                  value={formData.goal}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, goal: e.target.value }))
                  }
                  placeholder='Describe the main goal of this document'
                  rows={3}
                />
              </div>

              <div className='flex flex-col gap-2'>
                <Label>Goal Tags</Label>
                <div className='mb-2 flex gap-2'>
                  <Input
                    value={newGoalTag}
                    onChange={(e) => setNewGoalTag(e.target.value)}
                    placeholder='Add goal tag (inform, persuade, request, etc.)'
                    onKeyPress={(e) =>
                      e.key === 'Enter' && (e.preventDefault(), addGoalTag())
                    }
                  />
                  <Button type='button' onClick={addGoalTag}>
                    Add
                  </Button>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {formData.goalTags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant='secondary'
                      className='flex items-center gap-1 px-3 py-1'
                    >
                      {tag}
                      <X
                        className='hover:text-destructive h-3 w-3 cursor-pointer'
                        onClick={() => removeGoalTag(index)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Key Points */}
            <div className='space-y-4'>
              <div className='border-b pb-2'>
                <h3 className='text-primary text-lg font-semibold'>
                  Key Points
                </h3>
                <p className='text-muted-foreground text-sm'>
                  Main content requirements and topics
                </p>
              </div>
              {!isReadOnly && (
                <div className='mb-2 flex gap-2'>
                  <Input
                    value={newKeyPoint}
                    onChange={(e) => setNewKeyPoint(e.target.value)}
                    placeholder='Add key point'
                    onKeyPress={(e) =>
                      e.key === 'Enter' && (e.preventDefault(), addKeyPoint())
                    }
                    className='flex-1'
                  />
                  <Button
                    type='button'
                    onClick={addKeyPoint}
                    size='sm'
                    className='w-fit'
                  >
                    Add
                  </Button>
                </div>
              )}
              <div className='space-y-2'>
                {formData.keyPoints.map((point, index) => (
                  <div
                    key={index}
                    className='bg-muted flex items-center gap-2 rounded-lg border p-3'
                  >
                    <span className='flex-1 text-sm'>{point}</span>
                    {!isReadOnly && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => removeKeyPoint(index)}
                        className='hover:bg-destructive hover:text-destructive-foreground h-8 w-8 p-0'
                      >
                        <X className='h-4 w-4' />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Constraints */}
            <div className='space-y-4'>
              <div className='border-b pb-2'>
                <h3 className='text-primary text-lg font-semibold'>
                  Constraints
                </h3>
                <p className='text-muted-foreground text-sm'>
                  Requirements and restrictions
                </p>
              </div>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='flex flex-col gap-2'>
                  <Label>Must Include</Label>
                  <div className='mb-2 flex gap-2'>
                    <Input
                      value={newMustInclude}
                      onChange={(e) => setNewMustInclude(e.target.value)}
                      placeholder='Add requirement'
                      onKeyPress={(e) =>
                        e.key === 'Enter' &&
                        (e.preventDefault(), addMustInclude())
                      }
                    />
                    <Button type='button' onClick={addMustInclude}>
                      Add
                    </Button>
                  </div>
                  <div className='space-y-1'>
                    {formData.constraints.mustInclude.map((item, index) => (
                      <div
                        key={index}
                        className='bg-muted flex items-center gap-2 rounded p-1 text-sm'
                      >
                        <span className='flex-1'>{item}</span>
                        <X
                          className='h-3 w-3 cursor-pointer'
                          onClick={() => removeMustInclude(index)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className='flex flex-col gap-2'>
                  <Label>Must Avoid</Label>
                  <div className='mb-2 flex gap-2'>
                    <Input
                      value={newMustAvoid}
                      onChange={(e) => setNewMustAvoid(e.target.value)}
                      placeholder='Add restriction'
                      onKeyPress={(e) =>
                        e.key === 'Enter' &&
                        (e.preventDefault(), addMustAvoid())
                      }
                    />
                    <Button type='button' onClick={addMustAvoid}>
                      Add
                    </Button>
                  </div>
                  <div className='space-y-1'>
                    {formData.constraints.mustAvoid.map((item, index) => (
                      <div
                        key={index}
                        className='bg-muted flex items-center gap-2 rounded p-1 text-sm'
                      >
                        <span className='flex-1'>{item}</span>
                        <X
                          className='h-3 w-3 cursor-pointer'
                          onClick={() => removeMustAvoid(index)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Evidence & References */}
            <div className='space-y-4'>
              <div className='border-b pb-2'>
                <h3 className='text-primary text-lg font-semibold'>
                  Evidence & References
                </h3>
                <p className='text-muted-foreground text-sm'>
                  Supporting materials and citations
                </p>
              </div>
              <div className='mb-2 flex flex-col gap-2'>
                <Input
                  value={newEvidence}
                  onChange={(e) => setNewEvidence(e.target.value)}
                  placeholder='Add reference or evidence'
                  onKeyPress={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), addEvidence())
                  }
                />
                <Button type='button' onClick={addEvidence} className='w-fit'>
                  Add
                </Button>
              </div>
              <div className='space-y-1'>
                {formData.evidence.map((item, index) => (
                  <div
                    key={index}
                    className='bg-muted flex items-center gap-2 rounded p-2'
                  >
                    <span className='flex-1'>{item}</span>
                    <X
                      className='h-4 w-4 cursor-pointer'
                      onClick={() => removeEvidence(index)}
                    />
                  </div>
                ))}
              </div>
              <div>
                <Label>Evidence Mode</Label>
                <Select
                  value={formData.evidenceMode}
                  onValueChange={(value: any) =>
                    setFormData((prev) => ({ ...prev, evidenceMode: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='summary'>Summary</SelectItem>
                    <SelectItem value='verbatim'>Verbatim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Length & Formatting */}
            <div className='space-y-4'>
              <div className='border-b pb-2'>
                <h3 className='text-primary text-lg font-semibold'>
                  Length & Formatting
                </h3>
                <p className='text-muted-foreground text-sm'>
                  Document size and style preferences
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <div className='flex flex-col gap-2'>
                  <Label>Length Target</Label>
                  <div className='flex gap-2'>
                    <Input
                      type='number'
                      className='w-fit'
                      value={formData.length.target}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          length: {
                            ...prev.length,
                            target: parseInt(e.target.value) || 0
                          }
                        }))
                      }
                    />
                    <Select
                      value={formData.length.type}
                      onValueChange={(value: any) =>
                        setFormData((prev) => ({
                          ...prev,
                          length: { ...prev.length, type: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='words'>Words</SelectItem>
                        <SelectItem value='characters'>Characters</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className='flex flex-col gap-2'>
                  <Label>Style</Label>
                  <Select
                    value={formData.length.style}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({
                        ...prev,
                        length: { ...prev.length, style: value }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='tight'>Tight</SelectItem>
                      <SelectItem value='medium'>Medium</SelectItem>
                      <SelectItem value='long'>Long</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Tone & Style */}
            <div className='space-y-4'>
              <div className='border-b pb-2'>
                <h3 className='text-primary text-lg font-semibold'>
                  Tone & Style
                </h3>
                <p className='text-muted-foreground text-sm'>
                  Voice, formatting, and language preferences
                </p>
              </div>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='flex flex-col gap-2'>
                  <Label>Tone</Label>
                  <Select
                    value={formData.tone}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({ ...prev, tone: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='plain'>Plain</SelectItem>
                      <SelectItem value='formal'>Formal</SelectItem>
                      <SelectItem value='friendly'>Friendly</SelectItem>
                      <SelectItem value='punchy'>Punchy</SelectItem>
                      <SelectItem value='neutral'>Neutral</SelectItem>
                      <SelectItem value='aussie'>Aussie</SelectItem>
                      <SelectItem value='us'>US</SelectItem>
                      <SelectItem value='uk'>UK</SelectItem>
                      <SelectItem value='custom'>Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.tone === 'custom' && (
                  <div className='flex flex-col gap-2'>
                    <Label>Custom Tone</Label>
                    <Input
                      value={formData.customTone}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          customTone: e.target.value
                        }))
                      }
                      placeholder='Describe the desired tone'
                    />
                  </div>
                )}
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='flex flex-col gap-2'>
                  <Label>Spelling</Label>
                  <Select
                    value={formData.styleGuides.spelling}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({
                        ...prev,
                        styleGuides: { ...prev.styleGuides, spelling: value }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='au'>Australian</SelectItem>
                      <SelectItem value='us'>US</SelectItem>
                      <SelectItem value='uk'>UK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='flex flex-col gap-2'>
                  <Label>Date Format</Label>
                  <Select
                    value={formData.styleGuides.dateFormat}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({
                        ...prev,
                        styleGuides: { ...prev.styleGuides, dateFormat: value }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='dd/mm/yyyy'>DD/MM/YYYY</SelectItem>
                      <SelectItem value='mm/dd/yyyy'>MM/DD/YYYY</SelectItem>
                      <SelectItem value='yyyy-mm-dd'>YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='oxfordComma'
                  checked={formData.styleGuides.oxfordComma}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      styleGuides: {
                        ...prev.styleGuides,
                        oxfordComma: checked as boolean
                      }
                    }))
                  }
                />
                <Label htmlFor='oxfordComma'>Use Oxford Comma</Label>
              </div>
            </div>

            {/* Privacy & Review */}
            <div className='space-y-4'>
              <div className='border-b pb-2'>
                <h3 className='text-primary text-lg font-semibold'>
                  Privacy & Review
                </h3>
                <p className='text-muted-foreground text-sm'>
                  Quality control and privacy settings
                </p>
              </div>
              <div className='flex items-center gap-2 space-x-2'>
                <Checkbox
                  id='privacyMode'
                  checked={formData.privacyMode}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      privacyMode: checked as boolean
                    }))
                  }
                />
                <Label htmlFor='privacyMode'>
                  Privacy Mode (redact names & numbers until finalise)
                </Label>
              </div>

              <div>
                <Label>
                  Readability Grade Target:{' '}
                  {formData.reviewTargets.readabilityGrade}
                </Label>
                <Slider
                  value={[formData.reviewTargets.readabilityGrade]}
                  onValueChange={([value]) =>
                    setFormData((prev) => ({
                      ...prev,
                      reviewTargets: {
                        ...prev.reviewTargets,
                        readabilityGrade: value
                      }
                    }))
                  }
                  max={12}
                  min={1}
                  step={1}
                  className='w-full'
                />
              </div>
            </div>

            {/* Form Actions */}
            {!isReadOnly && (
              <div className='border-t pt-6'>
                <div className='flex flex-col justify-end gap-4 sm:flex-row'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={onCancel}
                    className='w-full sm:w-auto'
                  >
                    Cancel
                  </Button>
                  <Button
                    type='submit'
                    disabled={isLoading || !formData.title.trim()}
                    className='bg-primary hover:bg-primary/90 w-full sm:w-auto'
                  >
                    {isLoading ? (
                      <>
                        <div className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Icons.zap className='mr-2 h-4 w-4' />
                        Generate Document
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {isReadOnly && (
              <div className='border-t pt-6'>
                <div className='flex justify-end'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={onCancel}
                    className='w-full sm:w-auto'
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
