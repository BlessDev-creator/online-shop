/**
 * Custom line-art tab bar icons.
 * Each icon is built purely from React Native View + StyleSheet — no SVG library needed.
 * All icons share the same visual weight and a 28×28 bounding box.
 *
 * Usage:
 *   <HomeTabIcon color="#8EE53F" size={28} />
 *   <CategoriesTabIcon color="#999" size={28} />
 *   <CartTabIcon color="#8EE53F" size={28} />
 *   <ProfileTabIcon color="#999" size={28} />
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

const STROKE = 2.5; // uniform stroke weight

// ─────────────────────────────────────────────────────────────────────────────
// 1. HOME ICON
//    Shape: dome (semi-circle top) + straight vertical sides + flat bottom line
//    Inner: short horizontal dash at centre-bottom
// ─────────────────────────────────────────────────────────────────────────────
export function HomeTabIcon({ color, size = 28 }: { color: string; size?: number }) {
  const W   = size;
  const H   = size;
  const domeH  = H * 0.55;   // top semi-circle height
  const bodyH  = H * 0.45;   // lower rectangular body height
  const radius = W / 2;       // perfect semi-circle

  return (
    <View style={{ width: W, height: H }}>
      {/* Dome: top half — semi-circle via borderRadius on top corners only */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: domeH + STROKE, // small overlap so no gap
          borderTopLeftRadius: radius,
          borderTopRightRadius: radius,
          borderLeftWidth: STROKE,
          borderRightWidth: STROKE,
          borderTopWidth: STROKE,
          borderBottomWidth: 0,
          borderColor: color,
          backgroundColor: 'transparent',
        }}
      />
      {/* Body: lower rectangular section with sides + flat bottom */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: bodyH,
          borderLeftWidth: STROKE,
          borderRightWidth: STROKE,
          borderBottomWidth: STROKE,
          borderTopWidth: 0,
          borderColor: color,
          backgroundColor: 'transparent',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: H * 0.08,
        }}
      >
        {/* Inner dash */}
        <View
          style={{
            width: W * 0.28,
            height: STROKE,
            backgroundColor: color,
            borderRadius: 1.5,
          }}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CATEGORIES ICON
//    Left:  tall rounded rectangle (full height)
//    Right top: small square with rounded corners
//    Right bottom: magnifying glass (circle + diagonal handle)
// ─────────────────────────────────────────────────────────────────────────────
export function CategoriesTabIcon({ color, size = 28 }: { color: string; size?: number }) {
  const W  = size;
  const H  = size;
  const gap = W * 0.1;
  const leftW = W * 0.38;
  const rightW = W - leftW - gap;
  const halfH = (H - gap) / 2;
  const lensD = rightW * 0.62;

  return (
    <View style={{ width: W, height: H, flexDirection: 'row', gap }}>
      {/* Left tall rectangle */}
      <View
        style={{
          width: leftW,
          height: H,
          borderWidth: STROKE,
          borderColor: color,
          borderRadius: 6,
          backgroundColor: 'transparent',
        }}
      />

      {/* Right column */}
      <View style={{ width: rightW, height: H, justifyContent: 'space-between' }}>
        {/* Small square (top right) */}
        <View
          style={{
            width: rightW,
            height: halfH,
            borderWidth: STROKE,
            borderColor: color,
            borderRadius: 5,
            backgroundColor: 'transparent',
          }}
        />

        {/* Magnifying glass (bottom right) */}
        <View style={{ width: rightW, height: halfH, justifyContent: 'flex-start', alignItems: 'flex-start' }}>
          {/* Lens circle */}
          <View
            style={{
              width: lensD,
              height: lensD,
              borderRadius: lensD / 2,
              borderWidth: STROKE,
              borderColor: color,
              backgroundColor: 'transparent',
            }}
          />
          {/* Handle — short diagonal line approximated as a thin rotated view */}
          <View
            style={{
              position: 'absolute',
              bottom: halfH * 0.05,
              right: 0,
              width: STROKE,
              height: halfH * 0.42,
              backgroundColor: color,
              borderRadius: 1.5,
              transform: [{ rotate: '45deg' }],
              transformOrigin: 'top center',
            }}
          />
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CART ICON
//    Body: sleek basket (flat top rim, angled front, flat base) + left handle bar
//    Wheels: two small circle rings below the base
// ─────────────────────────────────────────────────────────────────────────────
export function CartTabIcon({ color, size = 28 }: { color: string; size?: number }) {
  const W      = size;
  const H      = size;
  const rimH   = H * 0.12;
  const bodyH  = H * 0.46;
  const wheelD = W * 0.17;
  const wheelY = H * 0.78;
  const handleW = W * 0.25;

  return (
    <View style={{ width: W, height: H }}>
      {/* Left handle bar — extends left of the basket */}
      <View
        style={{
          position: 'absolute',
          top: rimH + bodyH * 0.22,
          left: 0,
          width: handleW,
          height: STROKE,
          backgroundColor: color,
          borderRadius: 1.5,
        }}
      />

      {/* Top rim */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: handleW - STROKE,
          right: 0,
          height: rimH,
          borderTopWidth: STROKE,
          borderLeftWidth: STROKE,
          borderRightWidth: STROKE,
          borderBottomWidth: 0,
          borderColor: color,
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
          backgroundColor: 'transparent',
        }}
      />

      {/* Basket body */}
      <View
        style={{
          position: 'absolute',
          top: rimH,
          left: handleW - STROKE,
          right: 0,
          height: bodyH,
          borderLeftWidth: STROKE,
          borderRightWidth: STROKE,
          borderBottomWidth: STROKE,
          borderTopWidth: 0,
          borderColor: color,
          borderBottomLeftRadius: 5,
          borderBottomRightRadius: 5,
          backgroundColor: 'transparent',
        }}
      />

      {/* Wheel 1 (left) */}
      <View
        style={{
          position: 'absolute',
          top: wheelY,
          left: W * 0.28,
          width: wheelD,
          height: wheelD,
          borderRadius: wheelD / 2,
          borderWidth: STROKE,
          borderColor: color,
          backgroundColor: 'transparent',
        }}
      />

      {/* Wheel 2 (right) */}
      <View
        style={{
          position: 'absolute',
          top: wheelY,
          right: W * 0.14,
          width: wheelD,
          height: wheelD,
          borderRadius: wheelD / 2,
          borderWidth: STROKE,
          borderColor: color,
          backgroundColor: 'transparent',
        }}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PROFILE ICON
//    Outer: perfect circle
//    Eyes: two solid dots
//    Smile: upward-curving arc (approximated with a semi-oval)
// ─────────────────────────────────────────────────────────────────────────────
export function ProfileTabIcon({ color, size = 28 }: { color: string; size?: number }) {
  const W  = size;
  const H  = size;
  const eyeD = W * 0.12;
  const smileW = W * 0.42;
  const smileH = W * 0.2;

  return (
    <View
      style={{
        width: W,
        height: H,
        borderRadius: W / 2,
        borderWidth: STROKE,
        borderColor: color,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Eyes row */}
      <View
        style={{
          flexDirection: 'row',
          gap: W * 0.22,
          marginBottom: H * 0.07,
          marginTop: -H * 0.04,
        }}
      >
        {/* Left eye */}
        <View
          style={{
            width: eyeD,
            height: eyeD,
            borderRadius: eyeD / 2,
            backgroundColor: color,
          }}
        />
        {/* Right eye */}
        <View
          style={{
            width: eyeD,
            height: eyeD,
            borderRadius: eyeD / 2,
            backgroundColor: color,
          }}
        />
      </View>

      {/* Smile: bottom half of an ellipse (border-bottom + rounded corners) */}
      <View
        style={{
          width: smileW,
          height: smileH,
          borderBottomLeftRadius: smileW / 2,
          borderBottomRightRadius: smileW / 2,
          borderLeftWidth: STROKE,
          borderRightWidth: STROKE,
          borderBottomWidth: STROKE,
          borderTopWidth: 0,
          borderColor: color,
          backgroundColor: 'transparent',
        }}
      />
    </View>
  );
}
