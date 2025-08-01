import React from 'react';
import { Feather, MaterialIcons } from '@expo/vector-icons';

// Icon type definitions
export type SentimentIconType = 'bullish' | 'bearish' | 'neutral';
export type ActionIconType = 'ai' | 'bookmark' | 'bookmarked' | 'share' | 'more' | 'external';

interface IconProps {
  size?: number;
  color?: string;
}

interface SentimentIconProps extends IconProps {
  type: SentimentIconType;
}

interface ActionIconProps extends IconProps {
  type: ActionIconType;
}

// Sentiment Icons
export const SentimentIcon: React.FC<SentimentIconProps> = ({ type, size = 16, color }) => {
  switch (type) {
    case 'bullish':
      return <Feather name="trending-up" size={size} color={color || '#28c76f'} />;
    case 'bearish':
      return <Feather name="trending-down" size={size} color={color || '#ea5455'} />;
    case 'neutral':
      return <Feather name="arrow-right" size={size} color={color || '#f4c542'} />;
    default:
      return <Feather name="minus" size={size} color={color || '#f4c542'} />;
  }
};

// Action Icons
export const ActionIcon: React.FC<ActionIconProps> = ({ type, size = 20, color = '#a0a0a0' }) => {
  switch (type) {
    case 'ai':
      return <Feather name="star" size={size} color={color} />;
    case 'bookmark':
      return <Feather name="bookmark" size={size} color={color} />;
    case 'bookmarked':
      return <MaterialIcons name="bookmark" size={size} color={color} />;
    case 'share':
      return <Feather name="share-2" size={size} color={color} />;
    case 'more':
      return <Feather name="more-horizontal" size={size} color={color} />;
    case 'external':
      return <Feather name="external-link" size={size} color={color} />;
    default:
      return <Feather name="more-horizontal" size={size} color={color} />;
  }
};

// Generic Icon wrapper for custom usage
export const Icon = {
  Sentiment: SentimentIcon,
  Action: ActionIcon
};

export default Icon;
