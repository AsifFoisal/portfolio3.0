type IconProps = { className?: string };

export function ArrowIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.3" />
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