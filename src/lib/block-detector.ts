/**
 * Block Detection Algorithms
 * Intelligent algorithms to detect and classify text blocks from parsed PDF content
 */

import {
  BlockModel,
  BlockType,
  TextLine,
  DocumentModelUtils,
  BlockPosition,
  StyleModel,
  TableContent,
  ListContent,
  ListItem,
  HeadingLevel,
  ListType,
  TableRow,
  TableCell,
  ParsedTextItem
} from './document-model';

export class BlockDetector {
  private readonly HEADING_MIN_FONT_SIZE = 14; // Increased from 13
  private readonly HEADING_MAX_LENGTH = 100; // Decreased from 200
  private readonly TABLE_MIN_COLUMNS = 2;
  private readonly LIST_INDENT_THRESHOLD = 20;
  private readonly PARAGRAPH_MIN_LENGTH = 3;

  /**
   * Main entry point: Detect blocks from text lines
   */
  detectBlocks(textLines: TextLine[], pageNumber: number): BlockModel[] {
    if (textLines.length === 0) return [];

    console.log(
      `🔍 Detecting blocks from ${textLines.length} text lines on page ${pageNumber}`
    );
    console.log(
      '📝 All text lines with positions:',
      textLines.map((line, i) => ({
        index: i,
        text: line.text.substring(0, 50) + (line.text.length > 50 ? '...' : ''),
        fontSize: line.averageFontSize,
        y: line.y,
        bounds: line.bounds
      }))
    );

    const blocks: BlockModel[] = [];
    const processedLines = new Set<number>();

    // Step 1: Detect headings first (they're usually distinctive)
    const headingBlocks = this.detectHeadings(textLines, pageNumber);
    headingBlocks.forEach((block) => {
      blocks.push(block);
      this.markLinesAsProcessed(textLines, block, processedLines);
    });

    // Step 2: Detect tables (need multiple lines with similar structure)
    const tableBlocks = this.detectTables(
      textLines,
      pageNumber,
      processedLines
    );
    tableBlocks.forEach((block) => {
      blocks.push(block);
      this.markLinesAsProcessed(textLines, block, processedLines);
    });

    // Step 3: Detect lists (bullet points, numbering)
    const listBlocks = this.detectLists(textLines, pageNumber, processedLines);
    listBlocks.forEach((block) => {
      blocks.push(block);
      this.markLinesAsProcessed(textLines, block, processedLines);
    });

    // Step 4: Group remaining lines into paragraphs
    const paragraphBlocks = this.groupIntoParagraphs(
      textLines,
      pageNumber,
      processedLines
    );
    blocks.push(...paragraphBlocks);

    // Step 5: Post-process and clean up blocks
    const cleanedBlocks = this.postProcessBlocks(blocks);

    console.log(
      `✅ Detected ${cleanedBlocks.length} blocks: ${this.getBlockTypeCounts(cleanedBlocks)}`
    );

    return cleanedBlocks.sort(
      (a, b) => a.position.y - b.position.y || a.position.x - b.position.x
    );
  }

  /**
   * Detect heading blocks based on font size, styling, and content patterns
   */
  private detectHeadings(
    textLines: TextLine[],
    pageNumber: number
  ): BlockModel[] {
    const headings: BlockModel[] = [];

    for (let i = 0; i < textLines.length; i++) {
      const line = textLines[i];

      if (this.isHeadingCandidate(line, textLines)) {
        const headingLevel = this.determineHeadingLevel(line, textLines);
        const block = this.createHeadingBlock(line, pageNumber, headingLevel);
        headings.push(block);
      }
    }

    return headings;
  }

  /**
   * Check if a line is likely a heading
   */
  private isHeadingCandidate(line: TextLine, allLines?: TextLine[]): boolean {
    const text = line.text.trim();
    if (!text || text.length < 3) return false;

    // Dynamic font size check based on content
    const hasLargeFont = this.isLargeFontRelativeToContent(
      line,
      allLines || []
    );

    // Length check - headings are usually shorter
    const isShortLine = text.length <= this.HEADING_MAX_LENGTH;

    // Style checks
    const hasBoldFont = line.items.some(
      (item) =>
        item.fontWeight === 'bold' ||
        (item.fontFamily && item.fontFamily.toLowerCase().includes('bold'))
    );

    // Pattern checks
    const hasNumbering = /^\d+(\.\d+)*\.?\s/.test(text); // "1.", "1.1.", etc.
    const hasAllCaps = text === text.toUpperCase() && text.length > 3;
    const hasCapitalizedWords = /^[A-Z][a-z]/.test(text);
    const hasCommonHeadingWords =
      /^(chapter|section|introduction|conclusion|summary|overview|background|method|result|discussion)/i.test(
        text
      );

    // Much stricter scoring system
    let score = 0;
    if (hasLargeFont) score += 4; // Must have large font
    if (isShortLine) score += 2;
    if (hasBoldFont) score += 3;
    if (hasNumbering) score += 2;
    if (hasAllCaps) score += 2;
    if (hasCapitalizedWords) score += 1;
    if (hasCommonHeadingWords) score += 3;

    // Require much higher score AND large font
    return score >= 6 && hasLargeFont;
  }

  /**
   * Check if font size is large relative to the document content
   */
  private isLargeFontRelativeToContent(
    line: TextLine,
    allLines: TextLine[]
  ): boolean {
    if (allLines.length === 0)
      return line.averageFontSize >= this.HEADING_MIN_FONT_SIZE;

    // Calculate font size statistics from all lines
    const fontSizes = allLines.map((l) => l.averageFontSize);
    const avgFontSize =
      fontSizes.reduce((sum, size) => sum + size, 0) / fontSizes.length;
    const maxFontSize = Math.max(...fontSizes);

    // Sort to find percentiles
    const sortedSizes = fontSizes.sort((a, b) => a - b);
    const p75 = sortedSizes[Math.floor(sortedSizes.length * 0.75)]; // 75th percentile
    const p90 = sortedSizes[Math.floor(sortedSizes.length * 0.9)]; // 90th percentile

    console.log(
      `📊 Font analysis: avg=${avgFontSize.toFixed(1)}, max=${maxFontSize.toFixed(1)}, p75=${p75.toFixed(1)}, p90=${p90.toFixed(1)}, current=${line.averageFontSize.toFixed(1)}`
    );

    // A line is "large font" if it's:
    // 1. Significantly larger than average (at least 20% bigger)
    // 2. In the top 25% of font sizes (75th percentile or higher)
    // 3. At least 2 points larger than average
    const isSignificantlyLarger = line.averageFontSize >= avgFontSize * 1.2;
    const isInTopQuartile = line.averageFontSize >= p75;
    const isSubstantiallyBigger = line.averageFontSize >= avgFontSize + 2;

    return (isSignificantlyLarger && isInTopQuartile) || isSubstantiallyBigger;
  }

  /**
   * Determine heading level based on font size and context
   */
  private determineHeadingLevel(
    line: TextLine,
    allLines: TextLine[]
  ): HeadingLevel {
    const fontSize = line.averageFontSize;

    // Find all heading font sizes for comparison
    const headingSizes = allLines
      .filter((l) => this.isHeadingCandidate(l))
      .map((l) => l.averageFontSize)
      .sort((a, b) => b - a); // Descending order

    const uniqueSizes = [...new Set(headingSizes)];
    const sizeIndex = uniqueSizes.indexOf(fontSize);

    // Map to heading levels (1-6)
    const level = Math.min(sizeIndex + 1, 6) as HeadingLevel;

    // Pattern-based adjustments
    if (/^\d+\.\s/.test(line.text)) return Math.min(level, 2) as HeadingLevel; // "1. Title"
    if (/^\d+\.\d+\.\s/.test(line.text))
      return Math.min(level, 3) as HeadingLevel; // "1.1. Subtitle"

    return level;
  }

  /**
   * Create a heading block from a text line
   */
  private createHeadingBlock(
    line: TextLine,
    pageNumber: number,
    level: HeadingLevel
  ): BlockModel {
    const position: BlockPosition = {
      x: line.bounds.left,
      y: line.bounds.top,
      width: line.bounds.right - line.bounds.left,
      height: line.bounds.bottom - line.bounds.top
    };

    const style: StyleModel = {
      ...DocumentModelUtils.getDefaultStyle('heading'),
      fontSize: line.averageFontSize,
      fontWeight: this.extractFontWeight(line),
      headingLevel: level
    };

    return {
      id: DocumentModelUtils.generateId(),
      type: 'heading',
      content: line.text.trim(),
      position,
      style,
      metadata: {
        confidence: 0.9, // High confidence for detected headings
        originalFontSize: line.averageFontSize,
        originalColor: this.extractColor(line),
        originalBounds: position,
        textRuns: line.items.map((item) => ({
          text: item.text,
          fontSize: item.fontSize,
          fontWeight: item.fontWeight,
          fontStyle: item.fontStyle,
          color: item.color,
          position: { x: item.x, y: item.y }
        })),
        isEdited: false
      }
    };
  }

  /**
   * Detect table structures from aligned text
   */
  private detectTables(
    textLines: TextLine[],
    pageNumber: number,
    processedLines: Set<number>
  ): BlockModel[] {
    const tables: BlockModel[] = [];
    const availableLines = textLines.filter((_, i) => !processedLines.has(i));

    // Group consecutive lines that might form a table
    const potentialTableGroups = this.findAlignedTextGroups(availableLines);

    for (const group of potentialTableGroups) {
      if (this.looksLikeTable(group)) {
        const tableBlock = this.createTableBlock(group, pageNumber);
        if (tableBlock) {
          tables.push(tableBlock);
        }
      }
    }

    return tables;
  }

  /**
   * Find groups of aligned text that might be tables
   */
  private findAlignedTextGroups(lines: TextLine[]): TextLine[][] {
    const groups: TextLine[][] = [];
    let currentGroup: TextLine[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (this.hasMultipleColumns(line)) {
        currentGroup.push(line);
      } else {
        if (currentGroup.length >= 2) {
          groups.push([...currentGroup]);
        }
        currentGroup = [];
      }
    }

    // Don't forget the last group
    if (currentGroup.length >= 2) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Check if a line has multiple columns (for table detection)
   */
  private hasMultipleColumns(line: TextLine): boolean {
    // Look for significant gaps between text items
    const items = line.items.sort((a, b) => a.x - b.x);
    let gapCount = 0;

    for (let i = 0; i < items.length - 1; i++) {
      const gap = items[i + 1].x - (items[i].x + items[i].width);
      if (gap > 20) {
        // Threshold for column separation
        gapCount++;
      }
    }

    return gapCount >= 1; // At least one significant gap = at least 2 columns
  }

  /**
   * Check if a group of lines looks like a table
   */
  private looksLikeTable(lines: TextLine[]): boolean {
    if (lines.length < 2) return false;

    // Check if lines have similar column structure
    const columnPositions = this.extractColumnPositions(lines);
    const hasConsistentColumns =
      columnPositions.length >= this.TABLE_MIN_COLUMNS;

    // Check if content looks tabular (numbers, short text, etc.)
    const hasTabularContent = lines.some(
      (line) => /\d/.test(line.text) && line.text.split(/\s{2,}/).length >= 2
    );

    return hasConsistentColumns && hasTabularContent;
  }

  /**
   * Extract consistent column positions from table lines
   */
  private extractColumnPositions(lines: TextLine[]): number[] {
    const allPositions: number[] = [];

    lines.forEach((line) => {
      const items = line.items.sort((a, b) => a.x - b.x);
      items.forEach((item) => allPositions.push(item.x));
    });

    // Find positions that appear in multiple lines
    const positionCounts = new Map<number, number>();
    allPositions.forEach((pos) => {
      // Group similar positions (within 10 pixels)
      const roundedPos = Math.round(pos / 10) * 10;
      positionCounts.set(roundedPos, (positionCounts.get(roundedPos) || 0) + 1);
    });

    return Array.from(positionCounts.entries())
      .filter(([_, count]) => count >= 2)
      .map(([pos, _]) => pos)
      .sort((a, b) => a - b);
  }

  /**
   * Create a table block from aligned text lines
   */
  private createTableBlock(
    lines: TextLine[],
    pageNumber: number
  ): BlockModel | null {
    try {
      const columnPositions = this.extractColumnPositions(lines);
      const rows: TableRow[] = [];

      for (const line of lines) {
        const cells: TableCell[] = [];
        const items = line.items.sort((a, b) => a.x - b.x);

        // Group items by column positions
        const cellTexts = this.groupItemsByColumns(items, columnPositions);

        cellTexts.forEach((text) => {
          cells.push({
            content: text.trim(),
            colspan: 1,
            rowspan: 1
          });
        });

        rows.push({ cells });
      }

      const tableContent: TableContent = {
        rows,
        columnCount: columnPositions.length,
        hasHeader: this.detectTableHeader(rows)
      };

      const bounds = this.calculateGroupBounds(lines);
      const position: BlockPosition = {
        x: bounds.left,
        y: bounds.top,
        width: bounds.right - bounds.left,
        height: bounds.bottom - bounds.top
      };

      return {
        id: DocumentModelUtils.generateId(),
        type: 'table',
        content: tableContent,
        position,
        style: DocumentModelUtils.getDefaultStyle('table'),
        metadata: {
          confidence: 0.8,
          originalFontSize: lines[0]?.averageFontSize || 12,
          originalColor: this.extractColor(lines[0]) || '#000000',
          originalBounds: position,
          textRuns: [],
          isEdited: false
        }
      };
    } catch (error) {
      console.warn('Failed to create table block:', error);
      return null;
    }
  }

  /**
   * Group text items by column positions
   */
  private groupItemsByColumns(
    items: ParsedTextItem[],
    columnPositions: number[]
  ): string[] {
    const cellTexts: string[] = new Array(columnPositions.length).fill('');

    items.forEach((item) => {
      // Find the closest column position
      let closestColumnIndex = 0;
      let minDistance = Math.abs(item.x - columnPositions[0]);

      for (let i = 1; i < columnPositions.length; i++) {
        const distance = Math.abs(item.x - columnPositions[i]);
        if (distance < minDistance) {
          minDistance = distance;
          closestColumnIndex = i;
        }
      }

      cellTexts[closestColumnIndex] +=
        (cellTexts[closestColumnIndex] ? ' ' : '') + item.text;
    });

    return cellTexts;
  }

  /**
   * Detect if first row is likely a table header
   */
  private detectTableHeader(rows: TableRow[]): boolean {
    if (rows.length === 0) return false;

    const firstRow = rows[0];
    const firstRowText = firstRow.cells.map((cell) => cell.content).join(' ');

    // Heuristics for header detection
    const hasCapitalizedWords = /^[A-Z][a-z]/.test(firstRowText);
    const isShort = firstRow.cells.every((cell) => cell.content.length < 50);
    const hasNoNumbers = !firstRow.cells.some((cell) =>
      /^\d+(\.\d+)?$/.test(cell.content.trim())
    );

    return hasCapitalizedWords && isShort && hasNoNumbers;
  }

  /**
   * Detect list blocks (bullet points, numbered lists)
   */
  private detectLists(
    textLines: TextLine[],
    pageNumber: number,
    processedLines: Set<number>
  ): BlockModel[] {
    const lists: BlockModel[] = [];
    const availableLines = textLines.filter((_, i) => !processedLines.has(i));

    let i = 0;
    while (i < availableLines.length) {
      const line = availableLines[i];

      if (this.isListItemCandidate(line)) {
        // Find consecutive list items
        const listLines = this.collectListItems(availableLines, i);
        if (listLines.length >= 2) {
          const listBlock = this.createListBlock(listLines, pageNumber);
          if (listBlock) {
            lists.push(listBlock);
            i += listLines.length;
            continue;
          }
        }
      }
      i++;
    }

    return lists;
  }

  /**
   * Check if a line looks like a list item
   */
  private isListItemCandidate(line: TextLine): boolean {
    const text = line.text.trim();

    // Bullet point patterns
    const hasBullet = /^[•\-\*\+]\s/.test(text);

    // Numbered list patterns
    const hasNumbering =
      /^\d+[\.\)]\s/.test(text) || /^[a-zA-Z][\.\)]\s/.test(text);

    // Roman numeral patterns
    const hasRoman = /^[ivxlcdm]+[\.\)]\s/i.test(text);

    return hasBullet || hasNumbering || hasRoman;
  }

  /**
   * Collect consecutive list items starting from a given index
   */
  private collectListItems(lines: TextLine[], startIndex: number): TextLine[] {
    const listItems: TextLine[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];

      if (
        this.isListItemCandidate(line) ||
        this.isContinuationLine(line, listItems)
      ) {
        listItems.push(line);
      } else {
        break;
      }
    }

    return listItems;
  }

  /**
   * Check if a line is a continuation of the previous list item
   */
  private isContinuationLine(
    line: TextLine,
    existingItems: TextLine[]
  ): boolean {
    if (existingItems.length === 0) return false;

    const lastItem = existingItems[existingItems.length - 1];
    const isIndented =
      line.bounds.left > lastItem.bounds.left + this.LIST_INDENT_THRESHOLD;
    const isClose =
      Math.abs(line.bounds.top - lastItem.bounds.bottom) < lastItem.height;

    return isIndented && isClose;
  }

  /**
   * Create a list block from list item lines
   */
  private createListBlock(
    lines: TextLine[],
    pageNumber: number
  ): BlockModel | null {
    try {
      const items: ListItem[] = [];
      const firstLine = lines[0];
      const listType = this.determineListType(firstLine);

      for (const line of lines) {
        if (this.isListItemCandidate(line)) {
          const marker = this.extractListMarker(line.text);
          const content = line.text
            .replace(/^[•\-\*\+\d+a-zA-Z\)\.\s]+/, '')
            .trim();

          items.push({
            content,
            level: 1, // TODO: Detect nested levels
            marker
          });
        }
      }

      const listContent: ListContent = {
        items,
        type: listType,
        isOrdered: listType !== 'bullet'
      };

      const bounds = this.calculateGroupBounds(lines);
      const position: BlockPosition = {
        x: bounds.left,
        y: bounds.top,
        width: bounds.right - bounds.left,
        height: bounds.bottom - bounds.top
      };

      return {
        id: DocumentModelUtils.generateId(),
        type: 'list',
        content: listContent,
        position,
        style: {
          ...DocumentModelUtils.getDefaultStyle('list'),
          listType
        },
        metadata: {
          confidence: 0.85,
          originalFontSize: firstLine.averageFontSize,
          originalColor: this.extractColor(firstLine),
          originalBounds: position,
          textRuns: [],
          isEdited: false
        }
      };
    } catch (error) {
      console.warn('Failed to create list block:', error);
      return null;
    }
  }

  /**
   * Determine the type of list based on the first item
   */
  private determineListType(line: TextLine): ListType {
    const text = line.text.trim();

    if (/^\d+[\.\)]/.test(text)) return 'numbered';
    if (/^[a-zA-Z][\.\)]/.test(text)) return 'alpha';
    if (/^[ivxlcdm]+[\.\)]/i.test(text)) return 'roman';

    return 'bullet';
  }

  /**
   * Extract the list marker from text
   */
  private extractListMarker(text: string): string {
    const match = text.match(/^([•\-\*\+\d+a-zA-Z\)\.\s]+)/);
    return match ? match[1].trim() : '•';
  }

  /**
   * Group remaining unprocessed lines into paragraphs
   */
  private groupIntoParagraphs(
    textLines: TextLine[],
    pageNumber: number,
    processedLines: Set<number>
  ): BlockModel[] {
    const paragraphs: BlockModel[] = [];
    const availableLines = textLines
      .filter((_, i) => !processedLines.has(i))
      .sort((a, b) => a.y - b.y); // Sort by Y position

    let currentParagraph: TextLine[] = [];
    const PARAGRAPH_GAP_THRESHOLD = 25; // Max gap between lines in same paragraph

    for (let i = 0; i < availableLines.length; i++) {
      const line = availableLines[i];
      const trimmedText = line.text.trim();

      // Skip completely empty lines
      if (trimmedText.length === 0) {
        continue;
      }

      // Check if this line should start a new paragraph based on spacing
      let shouldStartNewParagraph = false;

      if (currentParagraph.length > 0) {
        const lastLine = currentParagraph[currentParagraph.length - 1];
        const gap = Math.abs(line.y - lastLine.y);

        // Start new paragraph if there's a large gap
        if (gap > PARAGRAPH_GAP_THRESHOLD) {
          shouldStartNewParagraph = true;
        }

        // Also check for significant font size changes (section breaks)
        const fontSizeDiff = Math.abs(
          line.averageFontSize - lastLine.averageFontSize
        );
        if (fontSizeDiff > 2) {
          shouldStartNewParagraph = true;
        }
      }

      // Start new paragraph if needed
      if (shouldStartNewParagraph && currentParagraph.length > 0) {
        paragraphs.push(
          this.createParagraphBlock(currentParagraph, pageNumber)
        );
        currentParagraph = [];
      }

      // Add line to current paragraph if it's long enough
      if (trimmedText.length >= this.PARAGRAPH_MIN_LENGTH) {
        currentParagraph.push(line);
      } else if (currentParagraph.length === 0) {
        // Short line by itself becomes its own paragraph
        paragraphs.push(this.createParagraphBlock([line], pageNumber));
      }
    }

    // Don't forget the last paragraph
    if (currentParagraph.length > 0) {
      paragraphs.push(this.createParagraphBlock(currentParagraph, pageNumber));
    }

    console.log(
      `📝 Created ${paragraphs.length} paragraph blocks from ${availableLines.length} available lines`
    );
    return paragraphs;
  }

  /**
   * Create a paragraph block from text lines
   */
  private createParagraphBlock(
    lines: TextLine[],
    pageNumber: number
  ): BlockModel {
    const text = lines
      .map((line) => line.text)
      .join(' ')
      .trim();
    const bounds = this.calculateGroupBounds(lines);

    const position: BlockPosition = {
      x: bounds.left,
      y: bounds.top,
      width: bounds.right - bounds.left,
      height: bounds.bottom - bounds.top
    };

    return {
      id: DocumentModelUtils.generateId(),
      type: 'paragraph',
      content: text,
      position,
      style: DocumentModelUtils.getDefaultStyle('paragraph'),
      metadata: {
        confidence: 0.9,
        originalFontSize: lines[0]?.averageFontSize || 12,
        originalColor: this.extractColor(lines[0]) || '#000000',
        originalBounds: position,
        textRuns: lines.flatMap((line) =>
          line.items.map((item) => ({
            text: item.text,
            fontSize: item.fontSize,
            fontWeight: item.fontWeight,
            fontStyle: item.fontStyle,
            color: item.color,
            position: { x: item.x, y: item.y }
          }))
        ),
        isEdited: false
      }
    };
  }

  /**
   * Helper methods
   */
  private markLinesAsProcessed(
    textLines: TextLine[],
    block: BlockModel,
    processedLines: Set<number>
  ): void {
    // Find which lines correspond to this block and mark them as processed
    textLines.forEach((line, index) => {
      if (this.lineOverlapsWithBlock(line, block)) {
        processedLines.add(index);
      }
    });
  }

  private lineOverlapsWithBlock(line: TextLine, block: BlockModel): boolean {
    return !(
      line.bounds.right < block.position.x ||
      line.bounds.left > block.position.x + block.position.width ||
      line.bounds.bottom < block.position.y ||
      line.bounds.top > block.position.y + block.position.height
    );
  }

  private calculateGroupBounds(lines: TextLine[]): {
    left: number;
    right: number;
    top: number;
    bottom: number;
  } {
    if (lines.length === 0) return { left: 0, right: 0, top: 0, bottom: 0 };

    return {
      left: Math.min(...lines.map((l) => l.bounds.left)),
      right: Math.max(...lines.map((l) => l.bounds.right)),
      top: Math.min(...lines.map((l) => l.bounds.top)),
      bottom: Math.max(...lines.map((l) => l.bounds.bottom))
    };
  }

  private extractFontWeight(line: TextLine): 'normal' | 'bold' {
    return line.items.some((item) => item.fontWeight === 'bold')
      ? 'bold'
      : 'normal';
  }

  private extractFontStyle(line: TextLine): 'normal' | 'italic' {
    return line.items.some((item) => item.fontStyle === 'italic')
      ? 'italic'
      : 'normal';
  }

  private extractFontFamily(line: TextLine): string {
    // Get the most common font family from the line items
    const fontFamilies = line.items
      .map((item) => item.fontFamily)
      .filter((family) => family);
    if (fontFamilies.length === 0) return 'Arial';

    // Return the first font family found (or most common if we want to be more sophisticated)
    return fontFamilies[0] || 'Arial';
  }

  private extractColor(line: TextLine): string {
    return line.items[0]?.color || '#000000';
  }

  private postProcessBlocks(blocks: BlockModel[]): BlockModel[] {
    // Remove very small blocks that are likely noise
    return blocks.filter(
      (block) =>
        block.position.width >= 10 &&
        block.position.height >= 5 &&
        (typeof block.content === 'string'
          ? block.content.trim().length >= 3
          : true)
    );
  }

  private getBlockTypeCounts(blocks: BlockModel[]): string {
    const counts = blocks.reduce(
      (acc, block) => {
        acc[block.type] = (acc[block.type] || 0) + 1;
        return acc;
      },
      {} as Record<BlockType, number>
    );

    return Object.entries(counts)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');
  }
}
