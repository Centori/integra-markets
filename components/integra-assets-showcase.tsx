'use client';

import React from 'react';
import { IntegraIconI, IntegraIconITransparent } from './integra-icon-i';
import {
  IntegraBrandingText,
  IntegraBrandingTextWhite,
  IntegraBrandingModern,
  IntegraBrandingMinimal,
} from './integra-branding-assets';

export const IntegraAssetsShowcase = () => {
  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-12 text-center">Integra Markets Branding Assets</h1>

        {/* Icon Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">App Icon - &quot;i&quot; Letter</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border border-gray-700 rounded-lg p-8 bg-gray-900">
              <p className="text-sm text-gray-400 mb-4">Icon with emerald background</p>
              <div className="flex justify-center">
                <IntegraIconI size={256} />
              </div>
            </div>
            <div className="border border-gray-700 rounded-lg p-8 bg-gray-900">
              <p className="text-sm text-gray-400 mb-4">Icon transparent background</p>
              <div className="flex justify-center bg-gradient-to-br from-gray-800 to-black rounded p-4">
                <IntegraIconITransparent size={256} />
              </div>
            </div>
          </div>
        </section>

        {/* Logo Variants */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Logo Variations</h2>
          <div className="space-y-8">
            {/* Emerald Green */}
            <div className="border border-gray-700 rounded-lg p-8 bg-gray-900">
              <p className="text-sm text-gray-400 mb-4">Emerald Green on Black</p>
              <IntegraBrandingText />
            </div>

            {/* White */}
            <div className="border border-gray-700 rounded-lg p-8 bg-gray-900">
              <p className="text-sm text-gray-400 mb-4">White on Black</p>
              <IntegraBrandingTextWhite />
            </div>

            {/* Modern */}
            <div className="border border-gray-700 rounded-lg p-8 bg-gray-900">
              <p className="text-sm text-gray-400 mb-4">Modern with Pixelated Accents</p>
              <IntegraBrandingModern />
            </div>

            {/* Minimal */}
            <div className="border border-gray-700 rounded-lg p-8 bg-gray-900">
              <p className="text-sm text-gray-400 mb-4">Minimal Style</p>
              <IntegraBrandingMinimal />
            </div>
          </div>
        </section>

        {/* Color Palette */}
        <section>
          <h2 className="text-2xl font-bold mb-8">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="w-full aspect-square rounded-lg mb-3" style={{ backgroundColor: '#4ECCA3' }} />
              <p className="text-sm font-mono">Primary</p>
              <p className="text-xs text-gray-400">#4ECCA3</p>
            </div>
            <div className="text-center">
              <div className="w-full aspect-square rounded-lg mb-3" style={{ backgroundColor: '#121212' }} />
              <p className="text-sm font-mono">Dark BG</p>
              <p className="text-xs text-gray-400">#121212</p>
            </div>
            <div className="text-center">
              <div className="w-full aspect-square rounded-lg mb-3 border border-gray-600" style={{ backgroundColor: 'white' }} />
              <p className="text-sm font-mono">White</p>
              <p className="text-xs text-gray-400">#FFFFFF</p>
            </div>
            <div className="text-center">
              <div className="w-full aspect-square rounded-lg mb-3" style={{ backgroundColor: '#A0A0A0' }} />
              <p className="text-sm font-mono">Gray</p>
              <p className="text-xs text-gray-400">#A0A0A0</p>
            </div>
            <div className="text-center">
              <div className="w-full aspect-square rounded-lg mb-3" style={{ backgroundColor: '#FF9999' }} />
              <p className="text-sm font-mono">Accent</p>
              <p className="text-xs text-gray-400">#FF9999</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
