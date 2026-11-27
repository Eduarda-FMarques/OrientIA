// The report uses built-in PDF fonts and requires no network access.
function createOrientationPdf(orientations) {
  const objects = [];
  const addObject = (body) => objects.push(body);
  const pages = [];
  addObject('<< /Type /Catalog /Pages 2 0 R >>');
  addObject('');
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  function encodeText(text) {
    return Array.from(text.normalize('NFC'), (character) => {
      const code = character.charCodeAt(0);
      return (code <= 255 ? code : 63).toString(16).padStart(2, '0');
    }).join('');
  }

  const left = 46;
  const width = 503;
  const ink = '0.10 0.16 0.25';
  const blue = '0.12 0.32 0.62';
  const muted = '0.30 0.36 0.44';
  const line = '0.84 0.88 0.93';
  const measure = document.createElement('canvas').getContext('2d');
  let commands = [];
  let y;

  function textWidth(text, size, bold) {
    if (!measure) return text.length * size * 0.65;
    measure.font = `${bold ? 'bold' : 'normal'} ${size}px Arial, sans-serif`;
    return measure.measureText(text).width;
  }

  function wrap(text, size, bold, limit) {
    const lines = [];
    let row = '';
    for (const word of text.split(/\s+/)) {
      const candidate = row ? row + ' ' + word : word;
      if (row && textWidth(candidate, size, bold) > limit) {
        lines.push(row);
        row = word;
      } else {
        row = candidate;
      }
    }
    if (row) lines.push(row);
    return lines;
  }

  function write(text, x, baseline, size, bold = false, color = ink) {
    commands.push(`${color} rg BT /F${bold ? 2 : 1} ${size} Tf ${x} ${baseline} Td <${encodeText(text)}> Tj ET`);
  }

  function ruleAt(baseline) {
    commands.push(`${line} RG 0.6 w ${left} ${baseline} m ${left + width} ${baseline} l S`);
  }

  function finishPage() {
    ruleAt(51);
    write('OrientIA · Guia de uso de IA em programação', left, 34, 9, false, muted);
    const pageNumber = 'Página ' + (pages.length + 1);
    write(pageNumber, left + width - textWidth(pageNumber, 9, false), 34, 9, false, muted);
    const stream = commands.join('\n') + '\n';
    const streamId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
    pages.push(addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamId} 0 R >>`));
  }

  for (const [index, orientation] of orientations.entries()) {
    function startPage(continuation = false) {
      commands = ['0.12 0.32 0.62 rg 0 833 595 9 re f'];
      write('ORIENTIA  /  RELATÓRIO DE ORIENTAÇÕES', left, 795, 10, true, blue);
      ruleAt(782);
      write(`Orientação ${index + 1} de ${orientations.length}${continuation ? ' · Continuação' : ''}`, left, 763, 10, true, muted);
      y = 738;
      for (const title of wrap(orientation.title, 22, true, width)) {
        write(title, left, y, 22, true);
        y -= 26;
      }
      y -= 3;
    }

    startPage();
    for (const section of orientation.sections) {
      let heading = section.title;
      for (const [label, value] of section.fields) {
        const highlighted = label === 'Exemplo de pedido' || label === 'Exemplo de pedido alternativo';
        const rows = wrap(value, 11, false, width - (highlighted ? 24 : 0));
        const height = 21 + rows.length * 14 + (highlighted ? 9 : 0);
        if (y - height - (heading ? 23 : 0) < 64) {
          finishPage();
          startPage(true);
        }
        if (heading) {
          ruleAt(y + 5);
          y -= 11;
          write(heading, left, y, 11, true, blue);
          y -= 14;
          heading = '';
        }
        if (highlighted) {
          commands.push(`0.94 0.96 0.99 rg ${left} ${y - height + 4} ${width} ${height + 3} re f`);
          y -= 5;
        }
        const x = left + (highlighted ? 12 : 0);
        write(label, x, y, 10, true, highlighted ? blue : ink);
        y -= 14;
        for (const row of rows) {
          write(row, x, y, 11);
          y -= 14;
        }
        y -= highlighted ? 11 : 7;
      }
    }

    finishPage();
  }

  objects[1] = `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((page) => page + ' 0 R').join(' ')}] >>`;
  // Text is hex-encoded, so all output characters occupy exactly one byte.
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((body, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  return pdf + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
}
