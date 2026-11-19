import type { Appointment } from './api';

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function date(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', dateStyle: 'long', timeStyle: 'short'
  }).format(new Date(value));
}

function escapePdf(value: string) {
  return value.replace(/[\r\n\t]/g, ' ').normalize('NFC')
    .replace(/[^\x20-\xff]/g, '?').replace(/([\\()])/g, '\\$1');
}

function text(x: number, y: number, size: number, font: 'F1' | 'F2', color: [number, number, number], value: string) {
  const [r, g, b] = color;
  return `${r} ${g} ${b} rg BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdf(value)}) Tj ET`;
}

function rect(x: number, y: number, width: number, height: number, color: [number, number, number]) {
  const [r, g, b] = color;
  return `${r} ${g} ${b} rg ${x} ${y} ${width} ${height} re f`;
}

function line(x1: number, y1: number, x2: number, y2: number, color: [number, number, number]) {
  const [r, g, b] = color;
  return `${r} ${g} ${b} RG 0.7 w ${x1} ${y1} m ${x2} ${y2} l S`;
}

function valueLines(value: string, max = 52) {
  const result: string[] = [];
  let remaining = value || 'No especificado';
  while (remaining.length > max) {
    let cut = remaining.lastIndexOf(' ', max);
    if (cut < 1) cut = max;
    result.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  result.push(remaining);
  return result;
}

export function receiptPdf(appointment: Appointment): Uint8Array {
  const navy: [number, number, number] = [0.08, 0.16, 0.27];
  const blue: [number, number, number] = [0.04, 0.39, 0.75];
  const muted: [number, number, number] = [0.39, 0.47, 0.57];
  const pale: [number, number, number] = [0.94, 0.97, 1];
  const white: [number, number, number] = [1, 1, 1];
  const green: [number, number, number] = [0.08, 0.48, 0.36];
  const commands: string[] = [];

  // Encabezado y logotipo vectorial de la identidad gráfica del prototipo.
  commands.push(rect(0, 742, 595, 100, blue));
  commands.push(rect(50, 768, 48, 48, white));
  commands.push(rect(69, 776, 10, 32, blue));
  commands.push(rect(58, 787, 32, 10, blue));
  commands.push(text(115, 797, 22, 'F2', white, 'Mi Salud'));
  commands.push(text(116, 779, 8, 'F1', [0.84, 0.93, 1], 'CITAS MÉDICAS · PORTAL DE ATENCIÓN'));
  commands.push(text(405, 800, 10, 'F2', white, 'COMPROBANTE DE CITA'));
  commands.push(text(405, 782, 8, 'F1', [0.84, 0.93, 1], 'DOCUMENTO DE DEMOSTRACIÓN'));

  commands.push(text(50, 710, 9, 'F2', blue, 'COMPROBANTE DE ATENCIÓN'));
  commands.push(text(50, 679, 24, 'F2', navy, `N.º ${appointment.id}`));
  commands.push(rect(435, 665, 110, 28, [0.90, 0.97, 0.94]));
  commands.push(text(450, 675, 9, 'F2', green, appointment.status.replaceAll('_', ' ')));
  commands.push(text(50, 651, 9, 'F1', muted, `Emitido: ${date(new Date().toISOString())}`));

  // Datos del paciente.
  commands.push(rect(45, 535, 505, 92, pale));
  commands.push(text(64, 604, 9, 'F2', blue, 'DATOS DEL PACIENTE'));
  commands.push(text(64, 580, 8, 'F2', muted, 'PACIENTE'));
  const patientLines = valueLines(appointment.patient, 60);
  patientLines.slice(0, 2).forEach((value, index) => commands.push(text(64, 559 - index * 15, 13, 'F2', navy, value)));

  // Datos del profesional y la especialidad.
  commands.push(text(50, 500, 9, 'F2', blue, 'DATOS DE LA ATENCIÓN'));
  commands.push(text(50, 476, 8, 'F2', muted, 'PROFESIONAL'));
  valueLines(appointment.doctor, 48).slice(0, 2).forEach((value, index) => commands.push(text(50, 457 - index * 14, 11, 'F2', navy, value)));
  commands.push(text(315, 476, 8, 'F2', muted, 'ESPECIALIDAD'));
  valueLines(appointment.specialty, 34).slice(0, 2).forEach((value, index) => commands.push(text(315, 457 - index * 14, 11, 'F2', navy, value)));
  commands.push(line(50, 420, 545, 420, [0.87, 0.90, 0.94]));

  // Fecha, horario y sede.
  commands.push(text(50, 395, 8, 'F2', muted, 'FECHA Y HORA'));
  valueLines(date(appointment.starts_at), 46).slice(0, 2).forEach((value, index) => commands.push(text(50, 376 - index * 14, 11, 'F2', navy, value)));
  commands.push(text(315, 395, 8, 'F2', muted, 'SEDE / ESTABLECIMIENTO'));
  valueLines(appointment.facility || 'Sede de demostración', 38).slice(0, 2).forEach((value, index) => commands.push(text(315, 376 - index * 14, 11, 'F2', navy, value)));

  const durationMinutes = Math.max(0, Math.round((new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60000));
  commands.push(rect(45, 285, 505, 45, [0.97, 0.98, 0.99]));
  commands.push(text(64, 312, 8, 'F2', muted, 'DURACIÓN PROGRAMADA'));
  commands.push(text(64, 295, 11, 'F2', navy, `${durationMinutes} minutos`));
  commands.push(text(315, 312, 8, 'F2', muted, 'ZONA HORARIA'));
  commands.push(text(315, 295, 11, 'F2', navy, 'America/Lima (UTC-05:00)'));

  commands.push(line(50, 245, 545, 245, [0.87, 0.90, 0.94]));
  commands.push(text(50, 220, 9, 'F2', blue, 'IMPORTANTE'));
  commands.push(text(50, 201, 9, 'F1', muted, 'Este comprobante pertenece a un prototipo académico de citas médicas.'));
  commands.push(text(50, 186, 9, 'F1', muted, 'No constituye una constancia oficial ni confirma una reserva en los sistemas de EsSalud.'));
  commands.push(rect(0, 0, 595, 62, [0.96, 0.98, 1]));
  commands.push(text(50, 36, 8, 'F2', navy, 'MI SALUD · CITAS MÉDICAS'));
  commands.push(text(50, 21, 8, 'F1', muted, 'Gracias por utilizar el portal de demostración.'));
  commands.push(text(425, 28, 8, 'F1', muted, `Comprobante #${appointment.id}`));

  const stream = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  ];
  let output = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(output.length);
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('');
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Uint8Array.from(output, character => character.charCodeAt(0));
}

export function downloadReceipt(appointment: Appointment) {
  save(new Blob([receiptPdf(appointment) as BlobPart], { type: 'application/pdf' }), `cita-${appointment.id}.pdf`);
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}
function utc(value: string) { return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'); }
function fold(lineValue: string) {
  let result = '', part = '', size = 0;
  for (const character of lineValue) {
    const bytes = new TextEncoder().encode(character).length;
    if (size + bytes > 75) { result += part + '\r\n'; part = ' '; size = 1; }
    part += character;
    size += bytes;
  }
  return result + part;
}
export function calendarText(appointment: Appointment): string {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mi Salud//Citas//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:cita-${appointment.id}@mi-salud.local`, `DTSTAMP:${utc(new Date().toISOString())}`,
    `DTSTART:${utc(appointment.starts_at)}`, `DTEND:${utc(appointment.ends_at)}`,
    `SUMMARY:${escapeIcs('Cita: ' + appointment.specialty)}`,
    `DESCRIPTION:${escapeIcs('Profesional: ' + appointment.doctor + '\nSede: ' + appointment.facility + '\nComprobante #' + appointment.id)}`,
    `LOCATION:${escapeIcs(appointment.facility || 'Sede de demostración')}`,
    'END:VEVENT', 'END:VCALENDAR'
  ].map(fold).join('\r\n') + '\r\n';
}
export function downloadCalendar(appointment: Appointment) {
  save(new Blob([calendarText(appointment)], { type: 'text/calendar;charset=utf-8' }), `cita-${appointment.id}.ics`);
}
