/**
 * Integra "integra" wordmark — the web counterpart of the mobile component at
 * `app/components/brand/IntegraWordmark.tsx`.
 *
 * Mobile replaced the old square "i" PNG on the news-card image fallback with
 * this typographic mark; web was still showing the PNG, so the same article
 * with no image looked like two different products depending on the device.
 *
 * Kept deliberately in sync with mobile's values:
 *   text          "integra"
 *   weight        700
 *   colour        #4ECCA3  (accentPositive)
 *   letterSpacing -1.5px at size 46
 *
 * Tracking is expressed in `em` rather than `px` so the mark keeps mobile's
 * proportions at any size — web renders it smaller on compact cards than the
 * fixed 46px mobile uses. -1.5 / 46 = -0.0326em.
 */

export interface IntegraWordmarkProps {
    /** Font size in px. Mobile's card fallback uses 46. */
    size?: number;
    /** Fill colour — defaults to the brand green. */
    color?: string;
    className?: string;
}

export default function IntegraWordmark({
    size = 46,
    color = '#4ECCA3',
    className = '',
}: IntegraWordmarkProps) {
    return (
        <span
            aria-hidden="true"
            className={`select-none leading-none font-bold ${className}`}
            style={{
                fontSize: `${size}px`,
                color,
                letterSpacing: '-0.0326em',
            }}
        >
            integra
        </span>
    );
}
