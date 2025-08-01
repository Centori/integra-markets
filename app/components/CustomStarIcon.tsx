import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface CustomStarIconProps {
  size?: number;
  color?: string;
  style?: any;
}

export const SingleStar: React.FC<CustomStarIconProps> = ({ 
  size = 35,
  color = '#4a9eff',
  style 
}) => {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg 
        width={size} 
        height={size * 0.75} 
        viewBox="0 0 400 300"
      >
        {/* Large sparkle */}
        <Path
          d="M 280,90 Q 260,130 220,150 Q 260,170 280,210 Q 300,170 340,150 Q 300,130 280,90 Z"
          fill={color}
        />
        
        {/* Medium sparkle top */}
        <Path
          d="M 170,90 Q 160,105 150,120 Q 160,135 170,150 Q 180,135 190,120 Q 180,105 170,90 Z"
          fill={color}
        />
        
        {/* Small sparkle bottom */}
        <Path
          d="M 200,200 Q 195,210 190,220 Q 195,230 200,240 Q 205,230 210,220 Q 205,210 200,200 Z"
          fill={color}
        />
      </Svg>
    </View>
  );
};

export const IconWithStars: React.FC<CustomStarIconProps> = ({ 
  size = 24, 
  color = '#4a9eff',
  style 
}) => {
  const scaleFactor = size / 240;
  
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg 
        width={size} 
        height={size} 
        viewBox="0 0 240 240"
      >
        {/* Container rectangle */}
        <Path
          d="M 60,20 L 180,20 Q 220,20 220,60 L 220,180 Q 220,220 180,220 L 60,220 Q 20,220 20,180 L 20,60 Q 20,20 60,20 Z"
          fill="none"
          stroke={color}
          strokeWidth={8}
        />
        
        {/* Large star top */}
        <Path
          d="M 150,30 Q 140,40 130,50 Q 140,60 150,70 Q 160,60 170,50 Q 160,40 150,30 Z"
          fill={color}
        />
        
        {/* Medium star left */}
        <Path
          d="M 90,76 Q 82,84 74,92 Q 82,100 90,108 Q 98,100 106,92 Q 98,84 90,76 Z"
          fill={color}
        />
        
        {/* Small star bottom */}
        <Path
          d="M 120,122 Q 114,128 108,134 Q 114,140 120,146 Q 126,140 132,134 Q 126,128 120,122 Z"
          fill={color}
        />
        
        {/* Tiny star right */}
        <Path
          d="M 160,108 Q 156,112 152,116 Q 156,120 160,124 Q 164,120 168,116 Q 164,112 160,108 Z"
          fill={color}
        />
      </Svg>
    </View>
  );
};

export default SingleStar;
