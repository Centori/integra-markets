// Typography System
export const Typography = {
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32
  },
  
  // Font Weights
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const
  },
  
  // Line Heights
  lineHeight: {
    tight: 16,
    normal: 20,
    relaxed: 24,
    loose: 28
  },
  
  // Common Text Styles
  styles: {
    // Headlines
    headline: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
      color: '#ffffff'
    },
    
    // Body text
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
      color: '#a0a0a0'
    },
    
    // Sentiment labels
    sentimentLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 16
    },
    
    // Source links
    sourceLink: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: '#30A5FF'
    },
    
    // Time stamps
    timestamp: {
      fontSize: 14,
      fontWeight: '400' as const,
      color: '#a0a0a0'
    },
    
    // Chip text
    chip: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: '#FFFFFF'
    },
    
    // Tab text
    tab: {
      fontSize: 14,
      fontWeight: '500' as const
    }
  }
};

export default Typography;
