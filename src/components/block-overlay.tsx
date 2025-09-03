'use client';

import React from 'react';
import { BlockModel } from '@/lib/document-model';

interface BlockOverlayProps {
  blocks: BlockModel[];
  selectedBlockId?: string;
  onBlockSelect: (block: BlockModel) => void;
  onBlockDoubleClick?: (block: BlockModel) => void;
  containerDimensions: { width: number; height: number };
  scale: number;
  showDebugInfo?: boolean;
  enableScaling?: boolean;
}

export function BlockOverlay({
  blocks,
  selectedBlockId,
  onBlockSelect,
  onBlockDoubleClick,
  containerDimensions,
  scale,
  showDebugInfo = false,
  enableScaling = false
}: BlockOverlayProps) {
  const handleBlockClick = (block: BlockModel, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onBlockSelect(block);
  };

  const handleBlockDoubleClick = (
    block: BlockModel,
    event: React.MouseEvent
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (onBlockDoubleClick) {
      onBlockDoubleClick(block);
    }
  };

  return (
    <div
      className='pointer-events-none absolute inset-0 select-none'
      style={{
        width: containerDimensions.width,
        height: containerDimensions.height
      }}
    >
      {blocks.map((block) => {
        const isSelected = block.id === selectedBlockId;
        const blockStyle = getBlockVisualStyle(block.type);

        return (
          <div
            key={block.id}
            className={`group pointer-events-auto absolute cursor-pointer transition-all duration-200 ${blockStyle.border} ${blockStyle.background} ${
              isSelected
                ? 'z-20 shadow-lg ring-2 ring-blue-500 ring-offset-1'
                : 'z-10 hover:shadow-md'
            } `}
            style={{
              left: block.position.x,
              top: block.position.y,
              width: block.position.width,
              height: block.position.height,
              minWidth: '10px',
              minHeight: '10px'
            }}
            onClick={(e) => handleBlockClick(block, e)}
            onDoubleClick={(e) => handleBlockDoubleClick(block, e)}
            title={createBlockTooltip(block)}
          >
            {/* Block Type Badge */}
            <div
              className={`absolute -top-5 left-0 rounded-sm px-2 py-0.5 text-xs font-medium whitespace-nowrap text-white opacity-0 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'group-hover:opacity-100'} ${blockStyle.badgeColor} `}
            >
              {block.type.toUpperCase()}
              {showDebugInfo && (
                <span className='ml-1 opacity-75'>
                  ({Math.round(block.metadata.confidence * 100)}%)
                </span>
              )}
            </div>

            {/* Selection Indicator */}
            {isSelected && (
              <div className='absolute inset-0 rounded-sm border-2 border-blue-400 bg-blue-100/20' />
            )}

            {/* Content Preview for Selected Block */}
            {isSelected && (
              <div
                className={`animate-fade-in absolute -bottom-8 left-0 z-30 max-w-xs rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg ${getBlockPreview(block).length > 50 ? 'w-64' : 'w-auto'} `}
              >
                <div className='truncate'>{getBlockPreview(block)}</div>
              </div>
            )}

            {/* Edit Indicator */}
            {block.metadata.isEdited && (
              <div className='absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-green-500' />
            )}
          </div>
        );
      })}

      {/* Overlay Info */}
      {showDebugInfo && (
        <div className='absolute right-2 bottom-2 rounded bg-black/80 px-2 py-1 text-xs text-white'>
          {blocks.length} blocks detected
        </div>
      )}
    </div>
  );
}

// Helper functions
function getBlockVisualStyle(blockType: string) {
  const styles = {
    heading: {
      border: 'border-2 border-purple-400/70',
      background: 'bg-purple-100/25 hover:bg-purple-100/35',
      badgeColor: 'bg-purple-600'
    },
    paragraph: {
      border: 'border border-blue-400/50',
      background: 'bg-blue-50/20 hover:bg-blue-50/30',
      badgeColor: 'bg-blue-600'
    },
    table: {
      border: 'border-2 border-green-400/70',
      background: 'bg-green-100/25 hover:bg-green-100/35',
      badgeColor: 'bg-green-600'
    },
    list: {
      border: 'border-2 border-orange-400/70',
      background: 'bg-orange-100/25 hover:bg-orange-100/35',
      badgeColor: 'bg-orange-600'
    },
    image: {
      border: 'border-2 border-pink-400/70',
      background: 'bg-pink-100/25 hover:bg-pink-100/35',
      badgeColor: 'bg-pink-600'
    },
    quote: {
      border: 'border-2 border-gray-400/70',
      background: 'bg-gray-100/25 hover:bg-gray-100/35',
      badgeColor: 'bg-gray-600'
    },
    code: {
      border: 'border-2 border-indigo-400/70',
      background: 'bg-indigo-100/25 hover:bg-indigo-100/35',
      badgeColor: 'bg-indigo-600'
    }
  };

  return (
    styles[blockType as keyof typeof styles] || {
      border: 'border border-gray-400/50',
      background: 'bg-gray-50/20 hover:bg-gray-50/30',
      badgeColor: 'bg-gray-600'
    }
  );
}

function createBlockTooltip(block: BlockModel): string {
  const confidence = Math.round(block.metadata.confidence * 100);
  const preview = getBlockPreview(block);
  const editStatus = block.metadata.isEdited ? ' (Edited)' : '';

  return `${block.type.toUpperCase()}${editStatus}\nConfidence: ${confidence}%\nContent: ${preview}`;
}

function getBlockPreview(block: BlockModel): string {
  if (typeof block.content === 'string') {
    return block.content.trim().length > 100
      ? block.content.trim().substring(0, 100) + '...'
      : block.content.trim();
  }

  switch (block.type) {
    case 'table':
      const table = block.content as any;
      const rowCount = table?.rows?.length || 0;
      const colCount = table?.columnCount || 0;
      return `Table with ${rowCount} rows and ${colCount} columns`;

    case 'list':
      const list = block.content as any;
      const itemCount = list?.items?.length || 0;
      const listType = list?.type || 'unknown';
      return `${listType} list with ${itemCount} items`;

    case 'image':
      const image = block.content as any;
      return `Image: ${image?.alt || image?.caption || 'Untitled image'}`;

    default:
      return 'No content preview available';
  }
}

// Custom animation classes (add to your global CSS if not already present)
const animations = `
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.2s ease-out forwards;
}
`;
