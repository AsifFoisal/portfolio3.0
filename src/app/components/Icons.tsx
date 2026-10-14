type IconProps = { className?: string };

export function ArrowIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function HamburgerIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 42 28" fill="none" aria-hidden="true">
      <rect x="0" y="0" width="30" height="5.5" rx="2.75" fill="currentColor" />
      <rect x="0" y="11" width="42" height="5.5" rx="2.75" fill="currentColor" />
      <rect x="20" y="22" width="22" height="5.5" rx="2.75" fill="currentColor" />
    </svg>
  );
}


export function PhoneIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m8.2 3.6 2.2 4.5-2.1 2.1a13 13 0 0 0 5.5 5.5l2.1-2.1 4.5 2.2v2.7a2 2 0 0 1-2.2 2C10.3 19.8 4.2 13.7 3.5 5.8a2 2 0 0 1 2-2.2h2.7Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 6 12 12M6 18 18 6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function TurnArrowIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6h8a6 6 0 0 1 6 6v8m-4-4 4 4 4-4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function QuoteIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 64 50" fill="currentColor" aria-hidden="true">
      <path d="M7 3h13L12 19h13v28H0V25L7 3Zm33 0h13L45 19h13v28H33V25L40 3Z" />
    </svg>
  );
}

export function WhatsAppIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.6-1.3.1-.2 0-.4 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7a11 11 0 0 0 4.2 3.7c.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

export function WhatsApp3DIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        {/* Sphere main lighting: brighter top-left, darker green bottom-right */}
        <radialGradient id="wa3d-sphere" cx="35%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#2fe36a" />
          <stop offset="45%" stopColor="#00c853" />
          <stop offset="85%" stopColor="#009638" />
          <stop offset="100%" stopColor="#006b24" />
        </radialGradient>
        {/* Specular curved gloss on the top/top-left */}
        <linearGradient id="wa3d-gloss" x1="20%" y1="0%" x2="50%" y2="80%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* Bottom rim reflection */}
        <radialGradient id="wa3d-rim" cx="50%" cy="85%" r="50%">
          <stop offset="0%" stopColor="#69f0ae" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#00c853" stopOpacity="0" />
        </radialGradient>
        <filter id="wa3d-drop" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* 3D Green Sphere */}
      <circle cx="18" cy="18" r="17" fill="url(#wa3d-sphere)" />
      
      {/* Bottom rim light for 3D realism */}
      <circle cx="18" cy="18" r="17" fill="url(#wa3d-rim)" />

      {/* Top curved specular bulb highlight */}
      <ellipse cx="14" cy="10" rx="9" ry="4.5" transform="rotate(-22 14 10)" fill="url(#wa3d-gloss)" />

      {/* Crisp White WhatsApp Symbol with gentle inner depth */}
      <g filter="url(#wa3d-drop)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M18 7.5C12.2 7.5 7.5 12.2 7.5 18C7.5 19.85 8 21.6 8.95 23.1L7.5 28.5L13.05 27.05C14.55 27.9 16.25 28.5 18 28.5C23.8 28.5 28.5 23.8 28.5 18C28.5 12.2 23.8 7.5 18 7.5ZM14.7 12.1C14.45 11.5 14.15 11.5 13.75 11.5C13.45 11.5 13.15 11.5 12.85 11.8C12.55 12.1 11.75 12.85 11.75 14.4C11.75 15.95 12.9 17.45 13.05 17.65C13.2 17.85 15.2 21.1 18.35 22.35C20.45 23.2 21.1 23.05 21.65 22.95C22.45 22.8 23.45 22.15 23.75 21.3C24.05 20.45 24.05 19.75 23.95 19.55C23.85 19.35 23.65 19.25 23.25 19.05C22.85 18.85 20.85 17.85 20.5 17.7C20.15 17.55 19.9 17.5 19.65 17.85C19.4 18.2 18.7 19.05 18.5 19.25C18.3 19.45 18.1 19.5 17.7 19.3C17.3 19.1 16.05 18.7 14.55 17.35C13.4 16.3 12.6 15.05 12.4 14.65C12.2 14.25 12.35 14.05 12.55 13.85C12.75 13.65 12.95 13.35 13.15 13.1C13.35 12.85 13.4 12.65 13.55 12.4C13.7 12.15 13.65 11.9 13.55 11.75C13.45 11.6 12.85 10.15 12.6 9.55L14.7 12.1Z"
          fill="#FFFFFF"
        />
        <path
          d="M21.9 22.5C21.4 22.6 20.8 22.75 18.9 22C16.1 20.9 14.3 18 14.15 17.85C14 17.65 13 16.3 13 14.9C13 13.5 13.7 12.8 14 12.5C14.25 12.25 14.5 12.25 14.75 12.25C15 12.25 15.2 12.25 15.4 12.75C15.65 13.35 16.2 14.75 16.25 14.9C16.35 15.05 16.4 15.25 16.3 15.45C16.2 15.65 16.1 15.8 15.95 16C15.8 16.2 15.65 16.4 15.45 16.6C15.25 16.8 15.05 17 15.3 17.4C15.55 17.8 16.4 19.2 17.65 20.3C19.25 21.7 20.55 22.15 20.95 22.35C21.35 22.55 21.55 22.5 21.75 22.3C21.95 22.1 22.65 21.25 22.9 20.9C23.15 20.55 23.4 20.6 23.75 20.75C24.1 20.9 26.1 21.9 26.5 22.1C26.9 22.3 27.1 22.4 27.2 22.6C27.3 22.8 27.3 23.5 27 24.3C26.7 25.1 25.7 25.8 24.9 25.95C24.35 26.05 23.7 25.9 21.9 22.5Z"
          fill="#FFFFFF"
        />
      </g>
    </svg>
  );
}

export function LinkedInIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM.4 8.4h4.2v15.1H.4V8.4Zm7.1 0h4v2.1h.1c.6-1.1 1.9-2.2 4-2.2 4.3 0 5.1 2.8 5.1 6.5v8.7h-4.2v-7.7c0-1.8 0-4.2-2.6-4.2s-3 2-3 4v7.9H7.5V8.4Z" />
    </svg>
  );
}

export function InstagramIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function OpenAIIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <ellipse key={angle} cx="12" cy="12" rx="3.1" ry="9" transform={`rotate(${angle} 12 12)`} stroke="currentColor" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

export function GrokIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.2 17.8 17.8 6.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function GeminiIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2c.62 5.4 4.06 8.84 9.46 9.46-5.4.62-8.84 4.06-9.46 9.46-.62-5.4-4.06-8.84-9.46-9.46C7.94 10.84 11.38 7.4 12 2Z" />
    </svg>
  );
}