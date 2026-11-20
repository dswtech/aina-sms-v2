import type { SVGAttributes } from 'react';

// "A" drawn as a road in perspective (DealDrive); public/favicon.svg uses the same paths.
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                d="M3.5 20.5 10.5 4.6a1.65 1.65 0 0 1 3 0l7 15.9"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M10.9 20.5h2.2l-.45-4.7h-1.3zM11.4 13.7h1.2l-.25-3.2h-.7z"
                fill="currentColor"
            />
        </svg>
    );
}
