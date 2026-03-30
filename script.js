(() => {
  const storage = window.MoneyTrackStorage;
  const charts = window.MoneyTrackCharts;

  const state = {
    transactions: storage.getTransactions(),
    filter: "all",
    settings: storage.getSettings(),
    purchase: storage.getPurchaseState(),
  };

  const elements = {
    body: document.body,
    transactionForm: document.getElementById("transactionForm"),
    purchaseForm: document.getElementById("purchaseForm"),
    historyList: document.getElementById("historyList"),
    incomeTotal: document.getElementById("incomeTotal"),
    expenseTotal: document.getElementById("expenseTotal"),
    balanceTotal: document.getElementById("balanceTotal"),
    chartCanvas: document.getElementById("financeChart"),
    chartLegend: document.getElementById("chartLegend"),
    chartTypeLabel: document.getElementById("chartTypeLabel"),
    themeToggle: document.getElementById("themeToggle"),
    notificationsToggle: document.getElementById("notificationsToggle"),
    chartTypeSelect: document.getElementById("chartTypeSelect"),
    calculatorBalance: document.getElementById("calculatorBalance"),
    calculatorProjection: document.getElementById("calculatorProjection"),
    calculatorSummary: document.getElementById("calculatorSummary"),
    purchaseResult: document.getElementById("purchaseResult"),
    toast: document.getElementById("toast"),
    filters: [...document.querySelectorAll(".filter-chip")],
  };

  const hasDashboard = Boolean(
    elements.transactionForm
    && elements.historyList
    && elements.incomeTotal
    && elements.expenseTotal
    && elements.balanceTotal
    && elements.chartCanvas
    && elements.chartLegend
    && elements.chartTypeLabel
    && elements.purchaseForm
    && elements.purchaseResult
  );

  const formatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const formatCurrency = (value) => formatter.format(Number(value) || 0);
  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const formatDate = (value) => {
    if (!value) {
      return "--";
    }

    return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T00:00:00`));
  };

  const generateId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const showToast = (message) => {
    if (!state.settings.notifications || !elements.toast) {
      return;
    }

    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2400);
  };

  const getSummary = () => {
    const summary = state.transactions.reduce((accumulator, transaction) => {
      const amount = Number(transaction.amount) || 0;

      if (transaction.type === "income") {
        accumulator.income += amount;
      } else {
        accumulator.expense += amount;
      }

      return accumulator;
    }, { income: 0, expense: 0 });

    return {
      ...summary,
      balance: summary.income - summary.expense,
    };
  };

  const getCategoryTotals = () => state.transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((accumulator, transaction) => {
      const category = transaction.category.trim() || "Outros";
      accumulator[category] = (accumulator[category] || 0) + Number(transaction.amount);
      return accumulator;
    }, {});

  const renderSummary = () => {
    if (!hasDashboard) {
      return;
    }

    const { income, expense, balance } = getSummary();
    elements.incomeTotal.textContent = formatCurrency(income);
    elements.expenseTotal.textContent = formatCurrency(expense);
    elements.balanceTotal.textContent = formatCurrency(balance);
  };

  const renderHistory = () => {
    if (!hasDashboard) {
      return;
    }

    const filtered = state.transactions
      .filter((transaction) => state.filter === "all" || transaction.type === state.filter)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!filtered.length) {
      elements.historyList.innerHTML = `
        <article class="history-empty">
          <strong>Nenhuma movimentacao encontrada.</strong>
          <p>Cadastre receitas ou despesas para comecar seu historico.</p>
        </article>
      `;
      return;
    }

    elements.historyList.innerHTML = filtered.map((transaction) => `
      <article class="history-item">
        <div>
          <p class="history-item__title">${escapeHtml(transaction.title)}</p>
          <p class="history-item__meta">${escapeHtml(transaction.category)} - ${transaction.type === "income" ? "Receita" : "Despesa"}</p>
          <p class="history-item__date">${formatDate(transaction.date)}</p>
        </div>
        <strong class="history-item__amount history-item__amount--${transaction.type}">
          ${transaction.type === "expense" ? "-" : "+"}${formatCurrency(transaction.amount)}
        </strong>
      </article>
    `).join("");
  };

  const renderLegend = (segments) => {
    if (!hasDashboard) {
      return;
    }

    elements.chartLegend.innerHTML = segments.map((segment) => `
      <span class="legend-item">
        <span class="legend-color" style="background:${segment.color}"></span>
        ${segment.label}: ${formatCurrency(segment.value)}
      </span>
    `).join("");
  };

  const renderChart = () => {
    if (!hasDashboard) {
      return;
    }

    const summary = getSummary();
    const categoryTotals = getCategoryTotals();
    const segments = charts.buildSegments(summary, categoryTotals);
    const chartLabels = {
      pie: "Pizza",
      bar: "Barras",
      line: "Linha",
    };

    elements.chartTypeLabel.textContent = chartLabels[state.settings.chartType] || "Pizza";
    renderLegend(segments);
    charts.render({
      canvas: elements.chartCanvas,
      segments,
      type: state.settings.chartType,
    });
  };

  const evaluatePurchase = () => {
    if (!hasDashboard) {
      return;
    }

    const purchaseAmount = Number(state.purchase.purchaseAmount) || 0;
    const { balance } = getSummary();
    const remainingBalance = balance - purchaseAmount;
    const savingsMargin = balance > 0 ? balance * 0.45 : 0;
    const idealSpendingLimit = balance - savingsMargin;
    const usageRatio = balance > 0 ? purchaseAmount / balance : 1;

    let variant = "neutral";
    let title = "Preencha o valor da compra para analisar.";
    let description = "O MoneyTrack usa o saldo atual e preserva uma margem razoavel para voce guardar parte do restante depois da compra.";
    let projection = "Adicione o valor da compra para ver quanto sobra depois da analise, mantendo uma margem razoavel para guardar.";
    let summaryResult = "Sobra prevista R$ 0,00";

    elements.calculatorBalance.textContent = formatCurrency(balance);

    if (purchaseAmount > 0) {
      projection = `Se comprar agora, seu saldo projetado fica em ${formatCurrency(remainingBalance)}. A margem recomendada para guardar com tranquilidade e ${formatCurrency(savingsMargin)}.`;

      if (balance <= 0) {
        variant = "danger";
        title = "Compra nao compensatoria";
        description = "Seu saldo atual ja esta zerado ou negativo, entao a compra tende a piorar a sua situacao financeira.";
        summaryResult = `Sobra prevista ${formatCurrency(remainingBalance)}`;
      } else if (purchaseAmount > balance) {
        variant = "danger";
        title = "Compra nao compensatoria";
        description = "O valor da compra ultrapassa o saldo atual disponivel, entao ela nao fecha com a sua realidade agora.";
        summaryResult = `Sobra prevista ${formatCurrency(remainingBalance)}`;
      } else if (remainingBalance >= savingsMargin && purchaseAmount <= idealSpendingLimit && usageRatio <= 0.35) {
        variant = "safe";
        title = "Compra compensatoria";
        description = "A compra cabe no seu saldo e ainda deixa uma parte razoavel guardada para voce manter reserva depois dela.";
        summaryResult = `Sobra prevista ${formatCurrency(remainingBalance)}`;
      } else if (remainingBalance >= savingsMargin * 0.85) {
        variant = "warning";
        title = "Compra razoavel";
        description = "A compra ainda cabe no saldo, mas deixa a sua margem de guardar dinheiro mais apertada do que o ideal.";
        summaryResult = `Sobra prevista ${formatCurrency(remainingBalance)}`;
      } else {
        variant = "danger";
        title = "Compra pouco compensatoria";
        description = "A compra ate pode caber no saldo, mas sobra pouco para guardar e sua reserva fica comprometida.";
        summaryResult = `Sobra prevista ${formatCurrency(remainingBalance)}`;
      }
    }

    elements.calculatorProjection.textContent = projection;
    elements.calculatorSummary.textContent = `Saldo atual considerado: ${formatCurrency(balance)} -> Valor da compra: ${formatCurrency(purchaseAmount)} -> Resultado: ${summaryResult}.`;
    elements.purchaseResult.className = `purchase-result purchase-result--${variant}`;
    elements.purchaseResult.innerHTML = `
      <span class="purchase-result__label">Status</span>
      <strong>${title}</strong>
      <p>${description}</p>
    `;
  };

  const applySettings = () => {
    elements.body.dataset.theme = state.settings.theme;

    if (elements.themeToggle) {
      elements.themeToggle.checked = state.settings.theme === "dark";
    }

    if (elements.notificationsToggle) {
      elements.notificationsToggle.checked = state.settings.notifications;
    }

    if (elements.chartTypeSelect) {
      elements.chartTypeSelect.value = state.settings.chartType;
    }
  };

  const syncPurchaseForm = () => {
    if (!elements.purchaseForm) {
      return;
    }

    Object.entries(state.purchase).forEach(([name, value]) => {
      const field = elements.purchaseForm.elements.namedItem(name);
      if (field) {
        field.value = value;
      }
    });
  };

  const setDefaultDate = () => {
    if (!elements.transactionForm) {
      return;
    }

    const dateField = elements.transactionForm.elements.namedItem("date");
    if (!dateField.value) {
      dateField.value = new Date().toISOString().slice(0, 10);
    }
  };

  const persistAll = () => {
    storage.saveTransactions(state.transactions);
    storage.saveSettings(state.settings);
    storage.savePurchaseState(state.purchase);
  };

  const refresh = () => {
    renderSummary();
    renderHistory();
    renderChart();
    evaluatePurchase();
    persistAll();
  };

  if (elements.transactionForm) {
    elements.transactionForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = new FormData(elements.transactionForm);
      const transaction = {
        id: generateId(),
        type: formData.get("type"),
        title: String(formData.get("title")).trim(),
        amount: Number(formData.get("amount")),
        category: String(formData.get("category")).trim(),
        date: formData.get("date"),
      };

      state.transactions.push(transaction);
      elements.transactionForm.reset();
      setDefaultDate();
      refresh();
      showToast("Movimentacao salva com sucesso.");
    });
  }

  elements.filters.forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      elements.filters.forEach((chip) => chip.classList.toggle("is-active", chip === button));
      renderHistory();
    });
  });

  if (elements.purchaseForm) {
    elements.purchaseForm.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      state.purchase[target.name] = target.value;
      evaluatePurchase();
      storage.savePurchaseState(state.purchase);
    });
  }

  if (elements.themeToggle) {
    elements.themeToggle.addEventListener("change", (event) => {
      state.settings.theme = event.target.checked ? "dark" : "light";
      applySettings();
      storage.saveSettings(state.settings);
      renderChart();
      showToast(`Tema ${state.settings.theme === "dark" ? "escuro" : "claro"} ativado.`);
    });
  }

  if (elements.notificationsToggle) {
    elements.notificationsToggle.addEventListener("change", (event) => {
      state.settings.notifications = event.target.checked;
      storage.saveSettings(state.settings);
      if (state.settings.notifications) {
        showToast("Notificacoes visuais ativadas.");
      }
    });
  }

  if (elements.chartTypeSelect) {
    elements.chartTypeSelect.addEventListener("change", (event) => {
      state.settings.chartType = event.target.value;
      storage.saveSettings(state.settings);
      renderChart();
      showToast(`Grafico em ${elements.chartTypeSelect.options[elements.chartTypeSelect.selectedIndex].text.toLowerCase()}.`);
    });
  }

  applySettings();
  syncPurchaseForm();
  setDefaultDate();
  refresh();
})();
