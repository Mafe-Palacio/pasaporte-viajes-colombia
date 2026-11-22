import React from 'react';

type SummaryIconProps = React.SVGProps<SVGSVGElement>;

const BASE_ICON_CLASS = 'h-[64px] md:h-[88px] w-auto max-w-[80%]';

const BASE_SVG_PROPS: React.SVGProps<SVGSVGElement> = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
};

export const CarIcon: React.FC<SummaryIconProps> = ({ className, ...props }) => (
    <svg
        viewBox="0 0 120 78"
        {...BASE_SVG_PROPS}
        className={className || BASE_ICON_CLASS}
        {...props}
    >
        <g transform="translate(-4,-31) scale(0.82)" strokeWidth="1.7">
            <path d="M12 108V92Q12 84 22 82L70 74L98 46Q102 42 110 42H182" />
            <path d="M12 108H38M86 108H214" />
            <path d="M38 108A24 24 0 0 1 86 108" />
            <circle cx="62" cy="110" r="18" />
            <circle cx="62" cy="110" r="7" />
            <path d="M104 70L118 48H172V70Z" />
            <path d="M16 91Q24 85 32 88" />
        </g>
    </svg>
);

export const PlateIcon: React.FC<SummaryIconProps> = ({ className, ...props }) => (
    <svg
        viewBox="0 0 120 120"
        {...BASE_SVG_PROPS}
        className={className || BASE_ICON_CLASS}
        {...props}
    >
        <circle cx="60" cy="60" r="52" />
        <circle cx="60" cy="60" r="43" strokeDasharray="230 40" />
        <path d="M42 34V56M48 34V56M54 34V56" />
        <path d="M42 56Q42 64 48 64Q54 64 54 56" />
        <path d="M48 64V92" />
        <path d="M64 34Q74 40 72 62H64Z" />
        <path d="M64 62V92" />
        <ellipse cx="84" cy="45" rx="8" ry="12" />
        <path d="M84 57V92" />
    </svg>
);

export const MoneyIcon: React.FC<SummaryIconProps> = ({ className, ...props }) => (
    <svg
        viewBox="0 0 120 90"
        {...BASE_SVG_PROPS}
        className={className || BASE_ICON_CLASS}
        {...props}
    >
        <path d="M14 28L24 18H92V50" />
        <rect x="6" y="28" width="74" height="44" rx="5" />
        <circle cx="43" cy="50" r="11" />
        <path d="M43 43V57M47 46Q43 43 39 46Q39 50 43 50Q47 50 47 54Q43 57 39 54" />
        <circle cx="88" cy="68" r="14" />
        <circle cx="88" cy="68" r="9" />
    </svg>
);

export const NotebookIcon: React.FC<SummaryIconProps> = ({ className, ...props }) => (
    <svg
        viewBox="0 0 120 96"
        {...BASE_SVG_PROPS}
        className={className || BASE_ICON_CLASS}
        {...props}
    >
        <rect x="34" y="8" width="56" height="80" rx="6" />
        <path d="M26 22H38M26 34H38M26 46H38M26 58H38M26 70H38" />
        <path d="M52 30H76M52 44H76M52 58H68" />
    </svg>
);

export const WeatherIcon: React.FC<SummaryIconProps> = ({ className, ...props }) => (
    <svg
        viewBox="0 0 120 100"
        {...BASE_SVG_PROPS}
        className={className || BASE_ICON_CLASS}
        {...props}
    >
        {/* Sol con rayos detrás de la nube */}
        <path d="M27 38 A9 9 0 1 1 43 34" />
        <path d="M35 14V18M22 19L25 22M17 31H21M22 43L25 40M48 19L45 22" />

        {/* Nube en primer plano */}
        <path d="M32 68H72A10 10 0 0 0 73 48A13.5 13.5 0 0 0 46 48A12.5 12.5 0 0 0 32 68Z" />

        {/* Montaña detrás */}
        <path d="M64 46L83 24Q86 21 89 24L112 78" />
        <path d="M79 40L86 44L93 39" />
        <path d="M14 78L25 63L31 68" />
        <path d="M12 78H112" />
    </svg>
);

