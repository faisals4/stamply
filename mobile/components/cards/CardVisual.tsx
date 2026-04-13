import { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as LucideIcons from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { CardDesign } from '../../lib/api';
import { pickStampGrid } from '../../lib/stampGrid';
import { shadows } from '../../lib/shadows';

/**
 * Mobile `CardVisual` — a 1:1 port of
 * `web/src/components/card/CardVisual.tsx` for React Native. Renders a
 * loyalty card with:
 *
 *   - header row: brand logo + title on the visual left, reward
 *     counter on the visual right
 *   - stamps strip: rounded rectangle filled with circles drawn via
 *     `pickStampGrid()` — the same layout engine used by the web build
 *     and the Apple Wallet `.pkpass` generator, so the mobile card
 *     matches every other surface down to the pixel grid
 *   - secondary row: stamps count on the visual left, customer name
 *     on the visual right
 *   - QR code tile: white rounded rectangle centred at the bottom
 *
 * Everything is rendered in LTR (`direction: 'ltr'` on the root
 * container) to match Apple Wallet's fixed-LTR pass layout. Arabic
 * glyphs inside still flow right-to-left thanks to Unicode BiDi, so
 * the card looks identical inside an Arabic phone and an English
 * phone. This is deliberate — the on-device Apple Wallet pass is the
 * design source of truth and it NEVER flips.
 */

type Props = {
  design: CardDesign | null;
  title: string;
  collectedStamps: number;
  customerName: string;
  serial: string;
  /**
   * Stamps required for the next reward cycle — mirrors the web
   * `<CardVisual>`'s `rewards[0]?.stampsRequired ?? design.stampsCount`
   * fallback. Used only for the secondary "stamps" row and the reward
   * counter in the header. The stamp grid always uses
   * `design.stampsCount` for its layout.
   */
  stampsRequired?: number;
  /** Override background image (brand overlay). Defaults to design.backgroundUrl. */
  backgroundUrl?: string | null;
  /**
   * Tenant-level brand logo from the API (e.g. from
   * `tenant.logo_url`). Used only as a fallback when the card
   * template itself doesn't override the logo via `design.logoUrl`.
   */
  brandLogoUrl?: string | null;
  /**
   * When true, hides the secondary row (stamps count + customer name)
   * and the QR code tile, leaving only the header and the stamps
   * strip. Used on the cards list so each card shows just its key
   * visual while the full details (QR, customer, stamps count) live
   * inside the bottom-sheet modal that opens on tap.
   */
  compact?: boolean;
};

// Look up a Lucide icon by its string name at runtime. Defaults to
// `Stamp` when the template references a name we don't have. Custom
// merchant-uploaded images are NOT handled here — see
// `isCustomStampIcon` below; the render path forks based on it.
function resolveIcon(name: string | undefined): LucideIcon {
  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  if (name && icons[name]) return icons[name];
  return icons.Stamp ?? icons.Circle;
}

/** True if the stamp icon value is a custom merchant-uploaded image
 *  rather than a Lucide icon name. Mirrors `isCustomIcon()` from
 *  `web/src/pages/cards/editor/stampIcons.ts` so the mobile and web
 *  builds agree on which strings are images vs icon names. */
function isCustomStampIcon(value: string | undefined): boolean {
  if (!value) return false;
  return value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://');
}

export function CardVisual({
  design,
  title,
  collectedStamps,
  customerName,
  serial,
  stampsRequired,
  backgroundUrl,
  brandLogoUrl,
  compact = false,
}: Props) {
  // Track logo load failures so a broken URL (e.g. the tenant logo
  // endpoint 404ing when the merchant hasn't uploaded one) doesn't
  // leave an empty-box placeholder in the header.
  const [logoFailed, setLogoFailed] = useState(false);
  // Natural dimensions of the loaded brand logo. Used to render the
  // image at a width that preserves its aspect ratio instead of
  // stretching it into a fixed box — so landscape badges and square
  // marks both look right. Until the load callback fires we use a
  // conservative default size.
  const [logoNatural, setLogoNatural] = useState<{ w: number; h: number } | null>(null);
  // Width of the stamps strip outer container — captured via
  // `onLayout` so we can compute a deterministic per-cell size that
  // doesn't change between rows when the last row has fewer cells.
  const [stripWidth, setStripWidth] = useState(0);
  // Sensible fallback colours so the card still renders if the API
  // omits `design` (e.g. a card template that predates the design
  // column being added — unlikely but cheap to guard against).
  const colors = design?.colors ?? {
    background: '#FEF3C7',
    foreground: '#78350F',
    stampsBackground: '#FCD34D',
    activeStamp: '#78350F',
    inactiveStamp: '#FDE68A',
  };

  const stampsCount = design?.stampsCount ?? 10;
  const layout = pickStampGrid(stampsCount);

  // Stamps strip — fixed-aspect-ratio container so every card on
  // the home screen takes the same vertical space regardless of how
  // many stamps it has. The card detail modal also benefits because
  // a 5-stamp card and a 30-stamp card now line up to the same
  // visual rhythm.
  //
  // Cell size is derived from BOTH the available width and the
  // available height; whichever dimension is the limiting factor
  // wins so the circles never overflow the strip in either axis.
  // This is the same trick `pickStampGrid` already uses to choose
  // the rows/cols layout, just applied to actual measured pixels.
  const STRIP_INNER_PAD = 8;
  const STAMP_GAP = 6;
  // Aspect ratio of the stamps strip — lower = shorter card.
  const STRIP_ASPECT = 0.42;
  const stripHeight = stripWidth > 0 ? Math.round(stripWidth * STRIP_ASPECT) : 0;
  const innerWidth = Math.max(0, stripWidth - STRIP_INNER_PAD * 2);
  const innerHeight = Math.max(0, stripHeight - STRIP_INNER_PAD * 2);
  const cellByWidth =
    innerWidth > 0 && layout.cols > 0
      ? (innerWidth - STAMP_GAP * (layout.cols - 1)) / layout.cols
      : 0;
  const cellByHeight =
    innerHeight > 0 && layout.rows > 0
      ? (innerHeight - STAMP_GAP * (layout.rows - 1)) / layout.rows
      : 0;
  const cellWidth =
    cellByWidth > 0 && cellByHeight > 0
      ? Math.floor(Math.min(cellByWidth, cellByHeight))
      : 0;
  const labels = design?.labels ?? {};
  const stampsLabel = labels.stamps || 'الأختام';
  const rewardLabel = labels.reward || 'المكافأة';
  const customerLabel = labels.customer || 'العميل';

  // Stamps required for the next reward — matches the web CardVisual
  // fallback: caller passes `rewards[0].stamps_required` when known,
  // else the design's total stamp count. Drives both the "stamps"
  // secondary row value (`collected/required`) and the reward counter.
  const requiredForNext = stampsRequired ?? stampsCount;
  const availableGifts =
    requiredForNext > 0 ? Math.floor(Math.max(0, collectedStamps) / requiredForNext) : 0;

  // Draw the stamp grid rows
  const cells = Array.from({ length: stampsCount }, (_, i) => i);
  const rows: number[][] = [];
  for (let r = 0; r < layout.rows; r++) {
    rows.push(cells.slice(r * layout.cols, (r + 1) * layout.cols));
  }

  // Custom merchant-uploaded stamp images take priority over the
  // Lucide icon name. The merchant editor stores them as base64
  // data URLs in `design.activeStampIcon` / `design.inactiveStampIcon`.
  const activeStampIcon = design?.activeStampIcon;
  const inactiveStampIcon = design?.inactiveStampIcon;
  const activeIsCustom = isCustomStampIcon(activeStampIcon);
  const inactiveIsCustom = isCustomStampIcon(inactiveStampIcon);
  const ActiveIcon = activeIsCustom ? null : resolveIcon(activeStampIcon);
  const InactiveIcon = inactiveIsCustom ? null : resolveIcon(inactiveStampIcon);

  const bgImage = backgroundUrl ?? design?.backgroundUrl ?? null;

  // Logo priority mirrors web CardVisual.tsx:
  //   1. `design.logoUrl` — per-template override set by the merchant
  //      in the card editor (e.g. the "صحبة" calligraphic mark on the
  //      example card)
  //   2. `brandLogoUrl` — tenant-wide brand logo (fallback when the
  //      card template has no logo of its own)
  //   3. none — the header renders just the title text
  const trimmedDesignLogo = design?.logoUrl?.trim();
  const logo = !logoFailed
    ? (trimmedDesignLogo && trimmedDesignLogo.length > 0
        ? trimmedDesignLogo
        : brandLogoUrl || null)
    : null;

  // Compute the logo box width from the image's natural aspect ratio
  // once it's loaded. Before that we render in a conservative SQUARE
  // slot so the common case (a square brand mark) doesn't sit inside
  // a wide letterbox during the first paint. Height is fixed so the
  // header keeps a stable vertical rhythm.
  const LOGO_MAX_HEIGHT = 28;
  const LOGO_MAX_WIDTH = 96;
  const logoWidth = logoNatural
    ? Math.min(LOGO_MAX_WIDTH, Math.round((LOGO_MAX_HEIGHT * logoNatural.w) / logoNatural.h))
    : LOGO_MAX_HEIGHT; // square default

  // Use `Image.getSize` so natural dimensions are resolved reliably
  // on both native and react-native-web. The Image `onLoad` event
  // callback is unreliable on RNW (its nativeEvent.source shape
  // varies between versions) — getSize is the stable path.
  useEffect(() => {
    if (!logo) return;
    let cancelled = false;
    Image.getSize(
      logo,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) {
          setLogoNatural({ w, h });
        }
      },
      () => {
        if (!cancelled) setLogoFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [logo]);

  const rootStyle: ViewStyle = {
    backgroundColor: colors.background,
    borderRadius: 14,
    overflow: 'hidden',
    // Shared card shadow — see mobile/lib/shadows.ts. Replaces the
    // older bespoke (0,8 / 20 / 0.075) values so loyalty cards and
    // every other card-shaped surface read with the same lift.
    ...shadows.card,
    // Fixed LTR so the layout never flips with the phone's language.
    direction: 'ltr',
  };

  return (
    <View style={rootStyle}>
      {bgImage ? (
        <Image
          source={{ uri: bgImage }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}

      {/* Header: logo + title (left) / reward counter (right) */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {logo ? (
            <Image
              source={{ uri: logo }}
              style={{ height: LOGO_MAX_HEIGHT, width: logoWidth, flexShrink: 0 }}
              resizeMode="contain"
              onError={() => setLogoFailed(true)}
            />
          ) : null}
          {title ? (
            <Text
              numberOfLines={1}
              // `textAlign: 'left'` pins the title to the start of
              // its flex slot right next to the logo. Without it an
              // Arabic title reads right-to-left and floats to the
              // far end of the slot, leaving an ugly gap between
              // the logo and the text.
              style={[styles.title, { color: colors.foreground, textAlign: 'left' }]}
            >
              {title}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.labelSmall, { color: colors.foreground }]}>{rewardLabel}</Text>
          <Text style={[styles.valueSmall, { color: colors.foreground }]}>{availableGifts}</Text>
        </View>
      </View>

      {/* Stamps strip — fixed aspect ratio (≈ 0.42) so every card
          takes the same vertical space regardless of stamp count.
          Cell size is the smaller of width-based and height-based
          fits, which guarantees equally sized circles in every row
          even when the last row is partial. */}
      <View
        style={styles.stripOuter}
        onLayout={(e) => setStripWidth(e.nativeEvent.layout.width)}
      >
        <View
          style={[
            styles.stripInner,
            {
              backgroundColor: colors.stampsBackground,
              // Lock the strip to the computed aspect ratio so every
              // card lines up to the same vertical rhythm.
              height: stripHeight || undefined,
              justifyContent: 'center',
            },
          ]}
        >
          {rows.map((row, rIdx) => (
            <View
              key={rIdx}
              style={[
                styles.stampRow,
                // Center the row when it has fewer cells than the
                // grid's column count so a 4 + 3 layout sits balanced.
                row.length < layout.cols ? { justifyContent: 'center' } : null,
              ]}
            >
              {row.map((i) => {
                const filled = i < collectedStamps;
                const borderColor = filled ? colors.activeStamp : colors.inactiveStamp;
                const fillBg = layout.mode === 'simple' && filled ? colors.activeStamp : 'transparent';
                return (
                  <View
                    key={i}
                    style={[
                      styles.stampCell,
                      cellWidth
                        ? { width: cellWidth, height: cellWidth }
                        : null,
                      {
                        borderColor,
                        backgroundColor: fillBg,
                      },
                    ]}
                  >
                    {layout.mode === 'icons'
                      ? filled
                        ? activeIsCustom && activeStampIcon
                          ? (
                            <Image
                              source={{ uri: activeStampIcon }}
                              // Mirror the web build's `widthPct = 55`
                              // by sizing the glyph at 55% of the
                              // measured cell.
                              style={{
                                width: cellWidth ? cellWidth * 0.6 : 20,
                                height: cellWidth ? cellWidth * 0.6 : 20,
                              }}
                              resizeMode="contain"
                            />
                          )
                          : ActiveIcon
                            ? (
                              <ActiveIcon
                                color={colors.activeStamp}
                                size={cellWidth ? Math.round(cellWidth * 0.6) : 20}
                                strokeWidth={1.8}
                              />
                            )
                            : null
                        : inactiveIsCustom && inactiveStampIcon
                          ? (
                            <Image
                              source={{ uri: inactiveStampIcon }}
                              style={{
                                width: cellWidth ? cellWidth * 0.6 : 20,
                                height: cellWidth ? cellWidth * 0.6 : 20,
                                opacity: 0.5,
                              }}
                              resizeMode="contain"
                            />
                          )
                          : InactiveIcon
                            ? (
                              <InactiveIcon
                                color={colors.inactiveStamp}
                                size={cellWidth ? Math.round(cellWidth * 0.6) : 20}
                                strokeWidth={1.8}
                              />
                            )
                            : null
                      : null}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Secondary row + QR are hidden in `compact` mode (cards list
          on the home tab). They're still rendered inside the card
          details bottom-sheet modal which passes `compact={false}`. */}
      {!compact && (
        <>
          {/* Secondary row: stamps (left) / customer (right).
              Explicit `textAlign` on every Text — relying on the
              parent's `direction: 'ltr'` style is unreliable on
              react-native-web when the document itself is `dir="rtl"`
              (the Arabic app locale). Arabic runs otherwise float
              to the RTL "start" of their line box, leaving the stamps
              label stranded in the middle of the card instead of
              flush-left underneath the logo. */}
          <View style={styles.secondary}>
            <View style={styles.secondaryCol}>
              <Text
                style={[styles.labelSmall, { color: colors.foreground, textAlign: 'left' }]}
              >
                {stampsLabel}
              </Text>
              <Text
                style={[styles.valueSmall, { color: colors.foreground, textAlign: 'left' }]}
              >
                {collectedStamps}/{requiredForNext}
              </Text>
            </View>
            <View style={styles.secondaryCol}>
              <Text
                style={[styles.labelSmall, { color: colors.foreground, textAlign: 'right' }]}
              >
                {customerLabel}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.valueSmall, { color: colors.foreground, textAlign: 'right' }]}
              >
                {customerName}
              </Text>
            </View>
          </View>

          {/* QR code tile */}
          <View style={styles.qrWrap}>
            <View style={styles.qrTile}>
              <QRCode value={serial} size={108} />
              <Text style={styles.qrLabel}>{serial}</Text>
            </View>
          </View>
        </>
      )}

      {/* Compact mode still needs a small bottom padding so the
          stamps strip doesn't hug the bottom edge of the card. */}
      {compact && <View style={{ height: 16 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  headerRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  logo: {
    // Match the web card (max-h-[30px] max-w-[96px]): let the image
    // scale naturally within the bounding box so landscape brand
    // marks and square icons both look balanced.
    height: 30,
    width: 96,
    flexShrink: 0,
  },
  title: {
    // No `flex: 1` here so the title hugs the logo with just the
    // parent's `gap` between them, instead of claiming the entire
    // remaining header width and letting the Arabic text float to
    // the far end of its line box. `flexShrink: 1` + `minWidth: 0`
    // let it truncate when the header gets narrower than the title.
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
    minWidth: 0,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 0,
  },
  valueSmall: {
    fontSize: 14,
  },
  stripOuter: {
    paddingHorizontal: 8,
  },
  stripInner: {
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  stampRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  stampCell: {
    // No `flex: 1` here — width and height come from the parent's
    // computed `cellWidth` so partial rows keep the same circle
    // size as full rows. Falls back to a sensible square when the
    // strip hasn't been measured yet (first render).
    borderWidth: 2,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12,
  },
  secondaryCol: {
    flex: 1,
    minWidth: 0,
  },
  qrWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  qrTile: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    gap: 8,
  },
  qrLabel: {
    fontSize: 11,
    color: '#3f3f46',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
});
