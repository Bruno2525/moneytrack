window.MoneyTrackStorage = (() => {
  const KEYS = {
    transactions: "moneytrack:transactions",
    settings: "moneytrack:settings",
    purchase: "moneytrack:purchase",
  };

  const read = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.error(`Erro ao ler ${key}`, error);
      return fallback;
    }
  };

  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Erro ao salvar ${key}`, error);
    }
  };

  return {
    getTransactions() {
      return read(KEYS.transactions, []);
    },
    saveTransactions(transactions) {
      write(KEYS.transactions, transactions);
    },
    getSettings() {
      return read(KEYS.settings, {
        theme: "light",
        notifications: true,
        chartType: "pie",
      });
    },
    saveSettings(settings) {
      write(KEYS.settings, settings);
    },
    getPurchaseState() {
      return read(KEYS.purchase, {
        purchaseAmount: "",
      });
    },
    savePurchaseState(state) {
      write(KEYS.purchase, state);
    },
  };
})();
