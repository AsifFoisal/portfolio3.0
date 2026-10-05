import { experience } from '../data/portfolio';

export function downloadResume() {
  const escapePdf = (text: string) => text.replace(/([\\()])/g, '\\$1');
  const commands: string[] = [];
  let y = 792;

  function line(text: string, size = 10, bold = false, gap = 16) {
    commands.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf 48 ${y} Td (${escapePdf(text)}) Tj ET`);
    y -= gap;
  }

  line('SEAM RAHMAN', 26, true, 32);
  line('UI/UX & Product Designer', 15, false, 27);
  line('Dhaka, Bangladesh | behance.net/seamrahman3', 10, false, 30);
  line('PROFILE', 12, true, 22);
  line('UI/UX & Product Designer with 2.5+ years of experience designing simple, intuitive,');
  line('user-centered digital products. Experience across cryptocurrency, SMM panels,');
  line('SaaS, mobile applications, and responsive websites.', 10, false, 28);
  line('WORK EXPERIENCE', 12, true, 24);
  experience.forEach((job) => {
    line(job.company, 12, true, 18);
    line(job.role, 10, true, 16);
    line(`${job.dates} | ${job.location}`, 9, false, 18);
    line(job.responsibilities[0][0], 9, false, 15);
    line(job.responsibilities[0][1], 9, false, 27);
  });
  line('EXPERTISE', 12, true, 21);
  line('UX Research | Product Strategy | Wireframing | Prototyping | UI Design', 10);
  line('Design Systems | Mobile Apps | SaaS | Web Apps & Dashboards', 10, false, 25);
  line('EDUCATION', 12, true, 20);
  line('BBA background with marketing and sales knowledge.', 10);

  // A self-contained PDF keeps the CV downloadable without a remote service.
  const stream = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Seam-Rahman-CV.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}