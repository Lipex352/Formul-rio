# Sistema de Briefings de Landing Page • Stanley Fellipe (Web Designer)

Sistema completo com formulário público de alta conversão para os clientes preencherem e painel administrativo separado para visualização, gestão, cópia formatada e exportação de todas as respostas.

---

## 🎨 Identidade Visual
- **Cores principais:** Preto profundo (`#0A0C10`, `#12151E`) e Laranja vibrante (`#FF6600`).
- **Logo oficial inclusa:** `<SF> Stanley Fellipe WEB DESIGNER` integrada ao cabeçalho.
- **Tipografia:** *Outfit* (títulos modernos e chamativos) e *Inter* (leitura limpa e profissional).

---

## 📋 Campos Inclusos no Formulário
1. **Segmento da Landing Page** (O que a página irá apresentar para o cliente final)
2. **Serviços oferecidos** (Lista detalhada dos serviços/produtos promovidos)
3. **Número para contato (WhatsApp)** (Com máscara automática e validação)
4. **E-mail de contato**
5. **Endereço físico** (Com opção de marcar como *Negócio 100% digital / Sem endereço físico*)
6. **Diferenciais competitivos** (Por que o cliente deve escolher a empresa)
7. **Quem somos** (História, missão, equipe e autoridade)
8. **Informações adicionais** (Cases de sucesso, depoimentos, resultados métricos e empresas clientes atendidas)

---

## 🚀 Como Executar

### Opção 1: Clique Duplo (Com Servidor Local e Banco `respostas.json`)
Dê um clique duplo no arquivo **`iniciar-servidor.bat`**.
- O servidor local iniciará automaticamente em `http://localhost:3000/`
- O formulário e o painel de respostas abrirão sozinhos no seu navegador!
- Todas as respostas enviadas serão salvas automaticamente no arquivo **`respostas.json`**.

### Opção 2: Acesso Direto (Sem Servidor / Standalone)
Basta dar um duplo clique diretamente nos arquivos:
- **`index.html`** → Abre o Formulário do Cliente.
- **`admin.html`** → Abre o Painel Administrativo de Respostas.
*(Funciona perfeitamente offline utilizando o armazenamento local `localStorage` e sincronização instantânea entre abas).*

### Opção 3: Hospedar na Internet (Gratuito)
Você pode subir esta pasta diretamente no **Vercel**, **Netlify** ou **GitHub Pages**.

---

## 🖥️ Recursos do Painel Administrativo (`admin.html`)
- **Contadores de Projetos:** Total, Novos Briefings, Em Produção e Concluídos.
- **Filtros e Busca em Tempo Real:** Pesquisa instantânea por qualquer palavra-chave, segmento ou contato.
- **Sincronização em Tempo Real:** Se o painel estiver aberto enquanto o cliente preenche, a nova resposta aparece na hora!
- **Alteração de Status em 1 Clique:** Marque como *Novo*, *Em Análise*, *Em Produção* ou *Concluído*.
- **Copiar Briefing Formatado:** Gera um texto estruturado e limpo pronto para colar no **Notion**, **Trello**, **ChatGPT** ou **Claude**.
- **Envio Direto no WhatsApp:** Botão com atalho para abrir o WhatsApp do cliente com uma mensagem pronta.
- **Exportações:**
  - Exportar para **JSON**
  - Exportar para **Excel / CSV**
  - Importar backups em JSON
  - Imprimir / Salvar em PDF com layout limpo.
