'use client';

import React, { useState, useEffect } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Save,
  X,
  Type,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Hash,
  List,
  Table,
  Quote,
  Code
} from 'lucide-react';
import {
  BlockModel,
  BlockType,
  HeadingLevel,
  FontWeight,
  FontStyle,
  TextAlign,
  DocumentModelUtils
} from '@/lib/document-model';

interface BlockEditorProps {
  block: BlockModel;
  isOpen: boolean;
  onSave: (updatedBlock: BlockModel) => void;
  onCancel: () => void;
  onDelete?: (blockId: string) => void;
}

export function BlockEditor({
  block,
  isOpen,
  onSave,
  onCancel,
  onDelete
}: BlockEditorProps) {
  const [editedBlock, setEditedBlock] = useState<BlockModel>(block);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset edited block when block prop changes
  useEffect(() => {
    setEditedBlock(block);
    setHasChanges(false);
  }, [block]);

  const updateBlock = (updates: Partial<BlockModel>) => {
    setEditedBlock((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updateBlockContent = (content: string | any) => {
    updateBlock({ content });
  };

  const updateBlockType = (newType: BlockType) => {
    updateBlock({
      type: newType,
      style: {
        ...editedBlock.style,
        ...DocumentModelUtils.getDefaultStyle(newType)
      }
    });
  };

  const updateStyle = (styleUpdates: Partial<typeof editedBlock.style>) => {
    updateBlock({
      style: { ...editedBlock.style, ...styleUpdates }
    });
  };

  const handleSave = () => {
    const finalBlock = DocumentModelUtils.updateBlockContent(
      editedBlock,
      editedBlock.content
    );
    onSave(finalBlock);
    setHasChanges(false);
  };

  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      );
      if (!confirmed) return;
    }
    onCancel();
    setHasChanges(false);
  };

  const handleDelete = () => {
    if (
      onDelete &&
      window.confirm('Are you sure you want to delete this block?')
    ) {
      onDelete(block.id);
    }
  };

  const blockTypeIcon = getBlockTypeIcon(editedBlock.type);
  const confidence = Math.round(editedBlock.metadata.confidence * 100);

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className='max-h-[90vh] max-w-4xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center space-x-2'>
            {blockTypeIcon}
            <span>
              Edit{' '}
              {editedBlock.type.charAt(0).toUpperCase() +
                editedBlock.type.slice(1)}
            </span>
            <Badge variant='secondary'>{confidence}% confidence</Badge>
            {editedBlock.metadata.isEdited && (
              <Badge variant='outline'>Modified</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Block Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className='text-sm'>Block Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={editedBlock.type}
                onValueChange={(value: BlockType) => updateBlockType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='paragraph'>📄 Paragraph</SelectItem>
                  <SelectItem value='heading'>📰 Heading</SelectItem>
                  <SelectItem value='list'>📋 List</SelectItem>
                  <SelectItem value='table'>📊 Table</SelectItem>
                  <SelectItem value='quote'>💭 Quote</SelectItem>
                  <SelectItem value='code'>💻 Code</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Content Editor */}
          <Card>
            <CardHeader>
              <CardTitle className='text-sm'>Content</CardTitle>
            </CardHeader>
            <CardContent>
              <BlockContentEditor
                block={editedBlock}
                onContentChange={updateBlockContent}
              />
            </CardContent>
          </Card>

          {/* Style Options */}
          <Card>
            <CardHeader>
              <CardTitle className='text-sm'>Formatting</CardTitle>
            </CardHeader>
            <CardContent>
              <BlockStyleEditor
                style={editedBlock.style}
                blockType={editedBlock.type}
                onStyleChange={updateStyle}
              />
            </CardContent>
          </Card>

          {/* Position & Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className='text-sm'>Position & Metadata</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label className='text-xs'>Position (x, y)</Label>
                  <div className='flex space-x-2'>
                    <Input
                      type='number'
                      value={Math.round(editedBlock.position.x)}
                      onChange={(e) =>
                        updateBlock({
                          position: {
                            ...editedBlock.position,
                            x: parseInt(e.target.value) || 0
                          }
                        })
                      }
                      className='text-sm'
                    />
                    <Input
                      type='number'
                      value={Math.round(editedBlock.position.y)}
                      onChange={(e) =>
                        updateBlock({
                          position: {
                            ...editedBlock.position,
                            y: parseInt(e.target.value) || 0
                          }
                        })
                      }
                      className='text-sm'
                    />
                  </div>
                </div>
                <div>
                  <Label className='text-xs'>Size (w × h)</Label>
                  <div className='flex space-x-2'>
                    <Input
                      type='number'
                      value={Math.round(editedBlock.position.width)}
                      onChange={(e) =>
                        updateBlock({
                          position: {
                            ...editedBlock.position,
                            width: parseInt(e.target.value) || 0
                          }
                        })
                      }
                      className='text-sm'
                    />
                    <Input
                      type='number'
                      value={Math.round(editedBlock.position.height)}
                      onChange={(e) =>
                        updateBlock({
                          position: {
                            ...editedBlock.position,
                            height: parseInt(e.target.value) || 0
                          }
                        })
                      }
                      className='text-sm'
                    />
                  </div>
                </div>
              </div>
              <div className='text-xs text-gray-500'>
                Original font size: {editedBlock.metadata.originalFontSize}px •
                Detection confidence: {confidence}%
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className='flex justify-between'>
          <div>
            {onDelete && (
              <Button variant='destructive' onClick={handleDelete}>
                Delete Block
              </Button>
            )}
          </div>
          <div className='flex space-x-2'>
            <Button variant='outline' onClick={handleCancel}>
              <X className='mr-1 h-4 w-4' />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges}>
              <Save className='mr-1 h-4 w-4' />
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Content editor component for different block types
function BlockContentEditor({
  block,
  onContentChange
}: {
  block: BlockModel;
  onContentChange: (content: any) => void;
}) {
  const content = block.content;

  switch (block.type) {
    case 'paragraph':
    case 'heading':
    case 'quote':
    case 'code':
      return (
        <Textarea
          value={typeof content === 'string' ? content : ''}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder={`Enter ${block.type} content...`}
          className='min-h-24 font-mono text-sm'
        />
      );

    case 'list':
      return <ListContentEditor content={content} onChange={onContentChange} />;

    case 'table':
      return (
        <TableContentEditor content={content} onChange={onContentChange} />
      );

    default:
      return (
        <Textarea
          value={
            typeof content === 'string'
              ? content
              : JSON.stringify(content, null, 2)
          }
          onChange={(e) => onContentChange(e.target.value)}
          className='min-h-24 font-mono text-sm'
        />
      );
  }
}

// Style editor component
function BlockStyleEditor({
  style,
  blockType,
  onStyleChange
}: {
  style: BlockModel['style'];
  blockType: BlockType;
  onStyleChange: (style: Partial<BlockModel['style']>) => void;
}) {
  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 gap-4'>
        <div>
          <Label className='text-xs'>Font Size</Label>
          <Input
            type='number'
            value={style.fontSize}
            onChange={(e) =>
              onStyleChange({ fontSize: parseInt(e.target.value) || 12 })
            }
            min='8'
            max='72'
            className='text-sm'
          />
        </div>
        <div>
          <Label className='text-xs'>Color</Label>
          <div className='flex space-x-2'>
            <input
              type='color'
              value={style.color}
              onChange={(e) => onStyleChange({ color: e.target.value })}
              className='h-8 w-12 cursor-pointer rounded border'
            />
            <Input
              value={style.color}
              onChange={(e) => onStyleChange({ color: e.target.value })}
              className='text-sm'
            />
          </div>
        </div>
      </div>

      <div className='flex space-x-2'>
        <Button
          variant={style.fontWeight === 'bold' ? 'default' : 'outline'}
          size='sm'
          onClick={() =>
            onStyleChange({
              fontWeight: style.fontWeight === 'bold' ? 'normal' : 'bold'
            })
          }
        >
          <Bold className='h-4 w-4' />
        </Button>
        <Button
          variant={style.fontStyle === 'italic' ? 'default' : 'outline'}
          size='sm'
          onClick={() =>
            onStyleChange({
              fontStyle: style.fontStyle === 'italic' ? 'normal' : 'italic'
            })
          }
        >
          <Italic className='h-4 w-4' />
        </Button>
      </div>

      <div className='flex space-x-2'>
        <Button
          variant={style.textAlign === 'left' ? 'default' : 'outline'}
          size='sm'
          onClick={() => onStyleChange({ textAlign: 'left' })}
        >
          <AlignLeft className='h-4 w-4' />
        </Button>
        <Button
          variant={style.textAlign === 'center' ? 'default' : 'outline'}
          size='sm'
          onClick={() => onStyleChange({ textAlign: 'center' })}
        >
          <AlignCenter className='h-4 w-4' />
        </Button>
        <Button
          variant={style.textAlign === 'right' ? 'default' : 'outline'}
          size='sm'
          onClick={() => onStyleChange({ textAlign: 'right' })}
        >
          <AlignRight className='h-4 w-4' />
        </Button>
      </div>

      {blockType === 'heading' && (
        <div>
          <Label className='text-xs'>Heading Level</Label>
          <Select
            value={style.headingLevel?.toString() || '1'}
            onValueChange={(value) =>
              onStyleChange({ headingLevel: parseInt(value) as HeadingLevel })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='1'>H1 - Main Title</SelectItem>
              <SelectItem value='2'>H2 - Section</SelectItem>
              <SelectItem value='3'>H3 - Subsection</SelectItem>
              <SelectItem value='4'>H4 - Minor Heading</SelectItem>
              <SelectItem value='5'>H5 - Small Heading</SelectItem>
              <SelectItem value='6'>H6 - Tiny Heading</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// List content editor (simplified for now)
function ListContentEditor({
  content,
  onChange
}: {
  content: any;
  onChange: (content: any) => void;
}) {
  const listContent = content || {
    items: [],
    type: 'bullet',
    isOrdered: false
  };

  const addItem = () => {
    const newItems = [
      ...listContent.items,
      { content: 'New item', level: 1, marker: '•' }
    ];
    onChange({ ...listContent, items: newItems });
  };

  const updateItem = (index: number, newContent: string) => {
    const newItems = [...listContent.items];
    newItems[index] = { ...newItems[index], content: newContent };
    onChange({ ...listContent, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = listContent.items.filter(
      (_: any, i: number) => i !== index
    );
    onChange({ ...listContent, items: newItems });
  };

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <Label className='text-xs'>List Items</Label>
        <Button size='sm' onClick={addItem}>
          Add Item
        </Button>
      </div>
      {listContent.items.map((item: any, index: number) => (
        <div key={index} className='flex space-x-2'>
          <Input
            value={item.content}
            onChange={(e) => updateItem(index, e.target.value)}
            className='text-sm'
          />
          <Button size='sm' variant='outline' onClick={() => removeItem(index)}>
            <X className='h-4 w-4' />
          </Button>
        </div>
      ))}
    </div>
  );
}

// Table content editor (simplified for now)
function TableContentEditor({
  content,
  onChange
}: {
  content: any;
  onChange: (content: any) => void;
}) {
  return (
    <div className='space-y-2'>
      <Label className='text-xs'>Table Content</Label>
      <Textarea
        value={JSON.stringify(content, null, 2)}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            // Invalid JSON, ignore
          }
        }}
        className='min-h-32 font-mono text-sm'
        placeholder='Table content (JSON format)'
      />
    </div>
  );
}

// Helper function to get block type icon
function getBlockTypeIcon(blockType: BlockType) {
  switch (blockType) {
    case 'heading':
      return <Hash className='h-4 w-4' />;
    case 'paragraph':
      return <Type className='h-4 w-4' />;
    case 'list':
      return <List className='h-4 w-4' />;
    case 'table':
      return <Table className='h-4 w-4' />;
    case 'quote':
      return <Quote className='h-4 w-4' />;
    case 'code':
      return <Code className='h-4 w-4' />;
    default:
      return <Type className='h-4 w-4' />;
  }
}
