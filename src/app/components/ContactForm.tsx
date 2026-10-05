import { useState, type FormEvent } from 'react';
import { portfolioUrl, services } from '../data/portfolio';
import { ArrowIcon } from './Icons';

type ContactFormProps = { intent: 'project' | 'call' };

export default function ContactForm({ intent }: ContactFormProps) {
  const [brief, setBrief] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const isCall = intent === 'call';

  function prepareBrief(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = [
      isCall ? 'Discovery call request for Seam Rahman' : 'Project enquiry for Seam Rahman',
      '',
      `Name: ${String(form.get('name')).trim()}`,
      `Email: ${String(form.get('email')).trim()}`,
      `Service: ${form.get('service')}`,
      ...(isCall ? [`Preferred date: ${form.get('date')}`, `Preferred time: ${form.get('time')} (your local time)`] : []),
      '',
      String(form.get('message')).trim(),
    ].join('\n');
    setBrief(text);
  }

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  }

  if (brief) {
    return (
      <div className="contact-success">
        <p className="dialog-eyebrow">LET&apos;S MAKE IT HAPPEN</p>
        <h2>Your {isCall ? 'call request' : 'project brief'} is ready.</h2>
        <p>Copy your brief and send it to Seam on Behance. {isCall ? 'A time is confirmed only after a reply.' : 'Start the conversation with everything in one place.'}</p>
        <textarea aria-label="Your prepared message" className="brief-preview" readOnly value={brief} onFocus={(event) => event.currentTarget.select()} />
        <div className="dialog-actions">
          <button className="solid-button" onClick={copyBrief}>{copied ? 'Copied to clipboard' : 'Copy brief'}</button>
          <a className="outline-button" href={portfolioUrl} target="_blank" rel="noreferrer">Continue on Behance <ArrowIcon /></a>
        </div>
        <p className="form-status" role="status">{copyError ? 'Select the message above and copy it manually.' : copied ? 'Your message is copied and ready to send.' : 'Nothing has been sent yet.'}</p>
        <button className="text-button" onClick={() => { setBrief(''); setCopied(false); setCopyError(false); }}>Start a new enquiry</button>
      </div>
    );
  }

  return (
    <div className="contact-content">
      <p className="dialog-eyebrow">{isCall ? 'BOOK A CALL' : 'CONTACT WITH ME'}</p>
      <h2>Let&apos;s build something meaningful.</h2>
      <p>Tell me what you have in mind. Prepare a brief below, then send it to me on Behance.</p>
      <form onSubmit={prepareBrief} className="contact-form">
        <div className="form-row">
          <label>Your name<input name="name" autoComplete="name" placeholder="Name" required maxLength={100} /></label>
          <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={150} /></label>
        </div>
        <label>What can I help with?
          <select name="service" defaultValue="Let's discuss the possibilities">
            <option>Let&apos;s discuss the possibilities</option>
            {services.map((service) => <option key={service.title}>{service.title}</option>)}
          </select>
        </label>
        {isCall && (
          <div className="form-row">
            <label>Preferred date<input name="date" type="date" min={new Date().toLocaleDateString('en-CA')} required /></label>
            <label>Preferred time<input name="time" type="time" required /></label>
          </div>
        )}
        <label>A little about your project<textarea name="message" rows={4} placeholder="Your idea, goals, timeline, and anything else I should know..." required maxLength={3000} /></label>
        <button className="solid-button" type="submit">Prepare {isCall ? 'call request' : 'project brief'} <ArrowIcon /></button>
      </form>
    </div>
  );
}