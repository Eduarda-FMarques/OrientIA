(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const form = $('analysisForm');
  const select = $('tipoUso');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const colorScheme = matchMedia('(prefers-color-scheme: dark)');
  let manualTheme = false;
  let changingTheme = false;
  let activeRule = null;
  let nextFileNumber = 1;
  const openFiles = [];
  let typingFrame = 0;

  const CONTEXTOS = {
    estudo: 'Estudo livre',
    pratica: 'Exercício de prática',
    trabalho: 'Trabalho acadêmico',
    avaliacao: 'Avaliação'
  };

  const RESUMOS = {
    Recomendado: 'A IA atua principalmente como apoio e preserva a participação do estudante na compreensão e na tomada de decisão.',
    Cautela: 'Há benefício pedagógico, mas parte do raciocínio pode ser transferida para a ferramenta. O uso exige limites claros.',
    Evitar: 'A IA tende a assumir uma etapa central da atividade ou entra em conflito com o contexto. O pedido deve ser reformulado.'
  };

  const CRITERIOS = ['Autonomia', 'Esforço cognitivo', 'Autoria', 'Aprendizagem', 'Contexto'];
  const PARTICIPACAO = { Recomendado: 'Alta', Cautela: 'Parcial', Evitar: 'Baixa' };

  function detalhesCriterio(nivel, nome, contexto, autorizacao) {
    if (nome === 'Contexto') {
      if (contexto !== 'avaliacao') return ['good', 'O contexto não adiciona uma restrição específica ao uso.'];
      if (autorizacao === 'sim') return ['medium', 'O uso depende dos limites definidos pelo professor ou pela instituição.'];
      return ['low', 'Sem autorização explícita, a atividade avaliativa prevalece sobre a recomendação geral.'];
    }

    const textos = {
      Recomendado: {
        Autonomia: 'As decisões principais continuam com o estudante.',
        'Esforço cognitivo': 'Ainda é necessário interpretar, testar e revisar.',
        Autoria: 'A produção central permanece com o estudante.',
        Aprendizagem: 'A interação tende a apoiar compreensão e reflexão.'
      },
      Cautela: {
        Autonomia: 'Parte das decisões pode ser transferida para a ferramenta.',
        'Esforço cognitivo': 'Há risco de redução de uma etapa do raciocínio.',
        Autoria: 'A participação do estudante precisa ser verificada.',
        Aprendizagem: 'Pode ajudar desde que a resposta não seja aceita automaticamente.'
      },
      Evitar: {
        Autonomia: 'A IA tende a assumir uma decisão central da atividade.',
        'Esforço cognitivo': 'Etapas importantes do raciocínio podem ser eliminadas.',
        Autoria: 'A solução pode deixar de representar a produção do estudante.',
        Aprendizagem: 'O resultado pode ser obtido sem desenvolver a competência esperada.'
      }
    };
    const classe = nivel === 'Recomendado' ? 'good' : nivel === 'Cautela' ? 'medium' : 'low';
    return [classe, textos[nivel][nome]];
  }


  function checked(name) {
    return form.elements[name].value;
  }

  function applyTheme(dark) {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $('theme').setAttribute('aria-pressed', String(dark));
    $('theme').innerHTML = dark ? '☀ <span>Tema claro</span>' : '☾ <span>Tema escuro</span>';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#10151e' : '#eef2f7';
  }

  async function toggleTheme() {
    if (changingTheme) return;
    manualTheme = true;
    const root = document.documentElement;
    const dark = root.dataset.theme !== 'dark';
    if (motion.matches || typeof document.startViewTransition !== 'function') {
      applyTheme(dark);
      return;
    }

    changingTheme = true;
    root.classList.add('theme-crossfade');
    try {
      await document.startViewTransition(() => applyTheme(dark)).finished;
    } catch {
      applyTheme(dark);
    } finally {
      root.classList.remove('theme-crossfade');
      changingTheme = false;
    }
  }

  function updateContext() {
    const evaluation = checked('contexto') === 'avaliacao';
    $('authorization').hidden = !evaluation;
    if (!evaluation) form.elements.autorizacao.value = 'nao_sei';
  }

  function updatePreview() {
    const rule = REGRAS.find((item) => item.id === select.value);
    $('usePreview').textContent = rule ? rule.beneficio : 'Escolha o tipo de ajuda para continuar.';
  }

  function moveTo(element) {
    element.focus({ preventScroll: true });
    element.scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth', block: 'nearest' });
  }

  function finishTyping() {
    cancelAnimationFrame(typingFrame);
    typingFrame = 0;
    for (const character of $('result').querySelectorAll('.typing-character')) {
      character.replaceWith(character.textContent);
    }
    $('result').normalize();
    const skip = $('skipTyping');
    if (document.activeElement === skip) $('resultTitle').focus({ preventScroll: true });
    skip.hidden = true;
  }

  function typeResult() {
    const characters = [];
    const segmenter = typeof Intl.Segmenter === 'function'
      ? new Intl.Segmenter('pt-BR', { granularity: 'grapheme' })
      : null;
    for (const line of $('result').querySelectorAll('[data-type]')) {
      if (line.hidden) continue;
      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        const fragment = document.createDocumentFragment();
        const letters = segmenter
          ? Array.from(segmenter.segment(node.data), ({ segment }) => segment)
          : Array.from(node.data);
        for (const letter of letters) {
          if (!letter.trim()) {
            fragment.append(letter);
            continue;
          }
          const character = document.createElement('span');
          character.className = 'typing-character typing-pending';
          character.textContent = letter;
          characters.push(character);
          fragment.append(character);
        }
        node.replaceWith(fragment);
      }
    }

    if (!characters.length) return;
    $('skipTyping').hidden = false;
    let startedAt;
    const interval = Math.max(7, Math.min(19, 6400 / characters.length)) / 1.5;
    let revealed = 0;

    function reveal(now) {
      startedAt ??= now + 120;
      const target = Math.min(characters.length, Math.floor((now - startedAt) / interval) + 1);
      if (target > revealed) {
        characters[revealed - 1]?.classList.remove('typing-caret');
        while (revealed < target) characters[revealed++].classList.remove('typing-pending');
        characters[revealed - 1].classList.add('typing-caret');
      }
      if (revealed === characters.length) finishTyping();
      else typingFrame = requestAnimationFrame(reveal);
    }
    typingFrame = requestAnimationFrame(reveal);
  }

  function clearResult() {
    finishTyping();
    activeRule = null;
    $('orientationTabs').hidden = true;
    $('result').hidden = true;
    $('empty').hidden = false;
    $('details').open = false;
    $('feedback').textContent = '';
    $('announcement').textContent = '';
  }

  function closeFile(file) {
    const index = openFiles.indexOf(file);
    openFiles.splice(index, 1);
    file.element.remove();
    if (activeRule !== file.rule) {
      openFiles.find((item) => item.rule === activeRule)?.button.focus();
      return;
    }
    const adjacent = openFiles[index] || openFiles[index - 1];
    if (adjacent) {
      showFile(adjacent);
      adjacent.button.focus();
    } else {
      clearResult();
      moveTo(select);
    }
  }

  function analyze(focus = true) {
    const rule = obterOrientacao(checked('contexto'), select.value, checked('autorizacao'));
    if (!rule) return;

    const number = nextFileNumber++;
    const filename = number === 1 ? 'orientação.md' : 'orientação-' + number + '.md';
    const description = filename + ' · ' + rule.nome + ' · ' + CONTEXTOS[rule.contexto];
    const element = document.createElement('div');
    element.className = 'file-tab';
    const button = document.createElement('button');
    button.type = 'button';
    button.title = description;
    button.setAttribute('aria-label', description);
    const icon = document.createElement('span');
    icon.className = 'file-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '▤';
    button.append(icon, filename);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'file-close';
    close.textContent = '×';
    close.title = 'Fechar ' + filename;
    close.setAttribute('aria-label', 'Fechar ' + description);

    const file = { rule, element, button };
    button.addEventListener('click', () => showFile(file));
    close.addEventListener('click', () => closeFile(file));
    element.append(button, close);
    openFiles.push(file);
    $('orientationTabs').append(element);
    $('orientationTabs').hidden = false;
    showFile(file, true);
    $('orientationTabs').scrollLeft = $('orientationTabs').scrollWidth;
    if (focus) {
      $('resultTitle').focus({ preventScroll: true });
      $('output-title').scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth', block: 'nearest' });
    }
  }

  function showFile(file, animate = false) {
    const rule = file.rule;
    const { contexto: context, autorizacaoAvaliacao: auth } = rule;
    for (const item of openFiles) {
      item.button.setAttribute('aria-pressed', String(item === file));
      item.element.classList.toggle('is-active', item === file);
    }
    finishTyping();
    $('details').open = false;
    activeRule = rule;

    const status = { Recomendado: 'good', Cautela: 'medium', Evitar: 'low' };
    $('badge').className = 'status ' + status[rule.nivel];
    $('badge').textContent = rule.nivel === 'Cautela' ? 'Uso com cautela' : rule.nivel;
    $('resultTitle').textContent = rule.nome;
    $('summary').textContent = RESUMOS[rule.nivel] + ' Atividade: ' + CONTEXTOS[context] + '.';
    $('contextAlert').textContent = rule.contextAlert || '';
    $('contextAlert').hidden = !rule.contextAlert;
    ['beneficio', 'risco', 'mitigacao'].forEach((key) => { $(key).textContent = rule[key]; });
    $('promptTitle').textContent = rule.nivel === 'Evitar' ? 'Exemplo de pedido alternativo' : 'Exemplo de pedido';
    $('promptText').textContent = rule.prompt;
    $('participation').textContent = 'Participação estimada do estudante: ' + PARTICIPACAO[rule.nivel] + '.';
    $('criteria').replaceChildren();
    for (const name of CRITERIOS) {
      const [, description] = detalhesCriterio(rule.nivel, name, context, auth);
      const term = document.createElement('dt');
      const definition = document.createElement('dd');
      term.textContent = name;
      definition.textContent = description;
      $('criteria').append(term, definition);
    }
    $('feedback').textContent = '';
    $('empty').hidden = true;
    $('result').hidden = false;
    $('announcement').textContent = 'Orientação: ' + $('badge').textContent;
    if (animate) typeResult();
  }

  function downloadPdf() {
    if (!openFiles.length) return;
    const orientations = openFiles.map(({ rule }) => {
      const { contexto, autorizacaoAvaliacao, nivel } = rule;
      const activity = [
        ['Atividade', CONTEXTOS[contexto]],
        ['Tipo de ajuda selecionado', rule.nome],
        ['Recomendação', nivel === 'Cautela' ? 'Uso com cautela' : nivel]
      ];
      if (rule.contextAlert) activity.push(['Regras da avaliação', rule.contextAlert]);
      const nextSteps = [
        ['Como proceder', rule.mitigacao],
        [nivel === 'Evitar' ? 'Exemplo de pedido alternativo' : 'Exemplo de pedido', rule.prompt]
      ];
      const rationale = [
        ['Resumo', RESUMOS[nivel]],
        ['Benefício', rule.beneficio],
        ['Risco', rule.risco],
        ['Participação estimada do estudante', PARTICIPACAO[nivel]]
      ];
      for (const criterio of CRITERIOS) {
        const [, description] = detalhesCriterio(nivel, criterio, contexto, autorizacaoAvaliacao);
        rationale.push([criterio, description]);
      }
      return {
        title: rule.nome,
        sections: [
          { title: 'Atividade e recomendação', fields: activity },
          { title: 'Orientação prática', fields: nextSteps },
          { title: 'Justificativa e critérios', fields: rationale }
        ]
      };
    });
    const pdf = new Blob([createOrientationPdf(orientations)], { type: 'application/pdf' });
    const url = URL.createObjectURL(pdf);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'OrientIA_Orientacoes.pdf';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function copyLocally(value) {
    const field = document.createElement('textarea');
    field.value = value;
    field.readOnly = true;
    field.style.cssText = 'position:fixed;inset:0 auto auto 0;opacity:0';
    document.body.append(field);
    field.select();
    try {
      return document.execCommand('copy');
    } finally {
      field.remove();
      $('copy').focus({ preventScroll: true });
    }
  }

  async function copyPrompt() {
    const rule = activeRule;
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(rule.prompt);
        copied = true;
      } else {
        copied = copyLocally(rule.prompt);
      }
    } catch {
      if (activeRule !== rule) return;
      try { copied = copyLocally(rule.prompt); } catch { copied = false; }
    }
    if (activeRule === rule) {
      $('feedback').textContent = copied ? 'Pedido copiado.' : 'Selecione o exemplo e copie o texto manualmente.';
    }
  }

  applyTheme(colorScheme.matches);
  colorScheme.addEventListener('change', (event) => {
    if (!manualTheme) applyTheme(event.matches);
  });
  $('theme').addEventListener('click', toggleTheme);

  const query = new URLSearchParams(location.search);
  select.add(new Option('Selecione um tipo de ajuda', ''));
  for (const rule of REGRAS) select.add(new Option(rule.nome, rule.id));
  if (Object.hasOwn(CONTEXTOS, query.get('contexto'))) form.elements.contexto.value = query.get('contexto');
  updateContext();
  if (checked('contexto') === 'avaliacao' && ['sim', 'nao', 'nao_sei'].includes(query.get('autorizacao'))) {
    form.elements.autorizacao.value = query.get('autorizacao');
  }
  if (REGRAS.some((rule) => rule.id === query.get('tipo'))) select.value = query.get('tipo');
  if (query.get('auto') === '1' && !select.value) select.selectedIndex = 1;
  updatePreview();
  if (query.get('auto') === '1') analyze(false);

  form.addEventListener('change', (event) => {
    if (event.target.name === 'contexto') updateContext();
    updatePreview();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    analyze();
  });
  $('downloadPdf').addEventListener('click', downloadPdf);
  $('skipTyping').addEventListener('click', finishTyping);
  $('copy').addEventListener('click', () => {
    finishTyping();
    copyPrompt();
  });
  $('details').addEventListener('toggle', () => {
    if ($('details').open) finishTyping();
  });
})();
