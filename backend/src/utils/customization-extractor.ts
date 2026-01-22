/**
 * Customization Extractor Utility
 * Extracts product customization details from WooCommerce line item meta data
 * for display on workflow cards and filtering
 */

export interface CustomizationDetails {
  board_style?: string;
  font?: string;
  board_color?: string;
  name_colors?: string;
  number_of_names?: number;
  names?: string[];
  names_text?: string;
  theme?: string;
  size?: string;
  raw_meta?: Array<{ key: string; value: any }>;
}

interface WooCommerceMetaData {
  key: string;
  value: any;
  display_key?: string;
  display_value?: any;
}

interface WooCommerceLineItem {
  id: number;
  name: string;
  quantity: number;
  total: string;
  meta_data?: WooCommerceMetaData[];
}

/**
 * Field name mappings for extracting customization details
 * Keys are our normalized field names, values are possible WooCommerce meta field names
 * Enhanced with comprehensive pattern matching for various customer field configurations
 */
const FIELD_MAPPINGS = {
  board_style: [
    'board-style', 
    'Board Style', 
    'style', 
    'Board-Style',
    'boardstyle',
    'board_style',
    'board type',
    'board-type',
    'boardtype',
    '_board_style',
    'Board Type'
  ],
  font: [
    'Font', 
    'font', 
    'Font Style', 
    'font-style',
    'fonttype',
    'font_choice',
    'font choice',
    'Font Type',
    'Font Choice',
    '_font',
    'font_type'
  ],
  board_color: [
    'Back Base Colour of Board', 
    'Board Colour', 
    'Base Colour', 
    'board-colour', 
    'board-color',
    'board_color',
    'boardcolor',
    'Color Choice',
    'color',
    'colour',
    '_board_color',
    'Board Color',
    'Color',
    'Colour',
    '_color'
  ],
  name_colors: [
    'Colours for Each Name', 
    'Name Colours', 
    'name-colours', 
    'name-colors',
    'name_colors',
    'namecolors',
    'Name Colors',
    'Colors for Names'
  ],
  number_of_names: [
    'name', 
    'Names', 
    'Names max (4)', 
    'Number of Names',
    'number_of_names',
    'numberofnames',
    '_number_of_names',
    'name_count',
    'Name Count',
    'name quantity',
    'namequantity'
  ],
  names_text: [
    'Names max (4) price applies as above', 
    'Names', 
    'names', 
    'Customer Names',
    'customer_names',
    'customernames',
    'Name List',
    'names_list',
    'actual names'
  ],
  theme: [
    'Adding a theme? Let us know here & view images to select colour', 
    'Theme', 
    'theme', 
    'Adding a theme?',
    'theme_selection',
    'themeselection',
    '_theme_selection',
    'Add Theme',
    'theme_option',
    'theme option'
  ],
  size: [
    'size', 
    'Size', 
    'Height', 
    'height',
    'Board Size',
    'board_size',
    'boardsize',
    'dimensions',
    'Dimensions'
  ],
};

/**
 * Find a meta field value by checking multiple possible field names (case-insensitive)
 * Enhanced with fuzzy matching to catch variations like underscores, hyphens, spaces
 */
function findMetaValue(metaData: WooCommerceMetaData[], possibleKeys: string[]): any | null {
  // Normalize a string for comparison (remove spaces, hyphens, underscores, make lowercase)
  const normalize = (str: string) => str.toLowerCase().replace(/[_\-\s]/g, '');

  for (const metaItem of metaData) {
    const normalizedMetaKey = normalize(metaItem.key);

    for (const key of possibleKeys) {
      const normalizedKey = normalize(key);

      // Exact normalized match
      if (normalizedMetaKey === normalizedKey) {
        return metaItem.value;
      }

      // Partial match - check if meta key contains the pattern
      if (normalizedMetaKey.includes(normalizedKey) || normalizedKey.includes(normalizedMetaKey)) {
        return metaItem.value;
      }
    }
  }
  return null;
}

/**
 * Parse number of names from values like "2 Names", "1 Name", "3 Names", "4 Names"
 */
function parseNumberOfNames(value: string): number | null {
  if (!value || typeof value !== 'string') return null;

  const match = value.match(/(\d+)\s*[Nn]ames?/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }

  return null;
}

/**
 * Parse names from comma-separated string like "Eve, Grace" or "John, Sarah, Mike"
 */
function parseNames(value: string): string[] | null {
  if (!value || typeof value !== 'string') return null;

  const names = value
    .split(',')
    .map(name => name.trim())
    .filter(name => name.length > 0);

  return names.length > 0 ? names : null;
}

/**
 * Extract customization details from WooCommerce line items
 * Returns null if no customization fields are found
 */
export function extractCustomizationDetails(lineItems: WooCommerceLineItem[], debug = false): CustomizationDetails | null {
  if (!lineItems || lineItems.length === 0) {
    return null;
  }

  // For now, we extract from the first line item
  // In the future, we could aggregate across multiple items if needed
  const firstItem = lineItems[0];

  if (!firstItem.meta_data || firstItem.meta_data.length === 0) {
    return null;
  }

  const metaData = firstItem.meta_data;
  
  // Debug: Log all meta field keys
  if (debug) {
    console.log('Available meta field keys:', metaData.map(m => m.key).join(', '));
  }
  
  const details: CustomizationDetails = {
    raw_meta: metaData, // Keep raw meta for debugging and future flexibility
  };

  // Extract board style
  const boardStyle = findMetaValue(metaData, FIELD_MAPPINGS.board_style);
  if (boardStyle) {
    details.board_style = String(boardStyle);
    if (debug) console.log('✓ Extracted board_style:', boardStyle);
  }

  // Extract font
  const font = findMetaValue(metaData, FIELD_MAPPINGS.font);
  if (font) {
    details.font = String(font);
    if (debug) console.log('✓ Extracted font:', font);
  }

  // Extract board color
  const boardColor = findMetaValue(metaData, FIELD_MAPPINGS.board_color);
  if (boardColor) {
    details.board_color = String(boardColor);
    if (debug) console.log('✓ Extracted board_color:', boardColor);
  }

  // Extract name colors
  const nameColors = findMetaValue(metaData, FIELD_MAPPINGS.name_colors);
  if (nameColors) {
    details.name_colors = String(nameColors);
    if (debug) console.log('✓ Extracted name_colors:', nameColors);
  }

  // Extract number of names
  const numNamesValue = findMetaValue(metaData, FIELD_MAPPINGS.number_of_names);
  if (numNamesValue) {
    const parsed = parseNumberOfNames(String(numNamesValue));
    if (parsed !== null) {
      details.number_of_names = parsed;
      if (debug) console.log('✓ Extracted number_of_names:', parsed);
    }
  }

  // Extract names text (actual customer names)
  const namesText = findMetaValue(metaData, FIELD_MAPPINGS.names_text);
  if (namesText) {
    details.names_text = String(namesText);
    if (debug) console.log('✓ Extracted names_text:', namesText);

    // Also parse into array
    const parsedNames = parseNames(String(namesText));
    if (parsedNames) {
      details.names = parsedNames;
    }
  }

  // Extract theme
  const theme = findMetaValue(metaData, FIELD_MAPPINGS.theme);
  if (theme) {
    details.theme = String(theme);
    if (debug) console.log('✓ Extracted theme:', theme);
  }

  // Extract size
  const size = findMetaValue(metaData, FIELD_MAPPINGS.size);
  if (size) {
    details.size = String(size);
    if (debug) console.log('✓ Extracted size:', size);
  }

  // Return null if no meaningful customization fields found
  // (excluding raw_meta which we always include)
  const hasCustomization =
    details.board_style ||
    details.font ||
    details.board_color ||
    details.name_colors ||
    details.number_of_names ||
    details.names_text ||
    details.theme ||
    details.size;

  if (!hasCustomization) {
    if (debug) console.log('⚠ No customization fields extracted');
    return null;
  }

  return details;
}

/**
 * Format customization details into a human-readable summary string
 * Used for display on OrderCard: "Large Board • Ballerina • Strawberry Milkshake • 2 Names"
 */
export function formatCustomizationSummary(details: CustomizationDetails | null): string | null {
  if (!details) return null;

  const parts: string[] = [];

  if (details.board_style) {
    parts.push(details.board_style);
  }

  if (details.font) {
    parts.push(details.font);
  }

  if (details.board_color) {
    parts.push(details.board_color);
  }

  if (details.number_of_names) {
    const nameLabel = details.number_of_names === 1 ? 'Name' : 'Names';
    parts.push(`${details.number_of_names} ${nameLabel}`);
  }

  return parts.length > 0 ? parts.join(' • ') : null;
}

/**
 * Validate that extracted customization details meet expected format
 * Useful for testing and debugging
 */
export function validateCustomizationDetails(details: CustomizationDetails): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate number_of_names is a positive integer
  if (details.number_of_names !== undefined) {
    if (!Number.isInteger(details.number_of_names) || details.number_of_names < 1) {
      errors.push('number_of_names must be a positive integer');
    }
  }

  // Validate names array matches number_of_names
  if (details.number_of_names && details.names) {
    if (details.names.length !== details.number_of_names) {
      errors.push(`number_of_names (${details.number_of_names}) does not match names array length (${details.names.length})`);
    }
  }

  // Validate all string fields are actually strings
  const stringFields: (keyof CustomizationDetails)[] = [
    'board_style', 'font', 'board_color', 'name_colors', 'names_text', 'theme', 'size'
  ];

  for (const field of stringFields) {
    const value = details[field];
    if (value !== undefined && typeof value !== 'string') {
      errors.push(`${field} must be a string, got ${typeof value}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
