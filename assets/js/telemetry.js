/**
 * ============================================================
 * Azure Application Insights – iGaming Telemetry Layer
 * Non-invasive instrumentation for slot machine UI
 * ============================================================
 */

(function () {
  // ---------- helpers ----------
  function whenAppInsightsReady(cb) {
    if (window.appInsights) cb();
    else setTimeout(() => whenAppInsightsReady(cb), 300);
  }

  function getNumberFromText(el) {
    if (!el) return null;
    const n = parseFloat(el.textContent.replace(/[^\d.]/g, ""));
    return isNaN(n) ? null : n;
  }

  // ---------- main ----------
  whenAppInsightsReady(() => {
    const ai = window.appInsights;

    // ---- page/session start ----
    ai.trackEvent({ name: "GameLoaded" });

    // ---- UI selectors (safe DOM-level hooks) ----
    const selectors = {
      spinBtn: "button[class*='btn_spin']",
      betValue: ".label_bet, .bet .value",
      linesValue: ".label_lines, .lines .value",
      balanceValue: ".label_balance",
      winValue: ".label_win, .label_win_total"
    };

    // ---- SPIN click ----
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(selectors.spinBtn);
      if (!btn) return;

      const bet = getNumberFromText(document.querySelector(selectors.betValue));
      const lines = getNumberFromText(document.querySelector(selectors.linesValue));
      const balance = getNumberFromText(document.querySelector(selectors.balanceValue));

      ai.trackEvent({
        name: "SpinClicked",
        properties: {
          bet,
          lines,
          balance
        }
      });
    });

    // ---- WIN detection (DOM mutation observer) ----
    const winEl = document.querySelector(selectors.winValue);
    if (winEl) {
      let lastWin = null;

      const winObserver = new MutationObserver(() => {
        const win = getNumberFromText(winEl);
        if (win !== null && win !== lastWin && win > 0) {
          lastWin = win;

          ai.trackEvent({
            name: "WinDetected",
            properties: {
              winAmount: win
            }
          });

          ai.trackMetric({
            name: "WinAmount",
            average: win
          });
        }
      });

      winObserver.observe(winEl, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }

    // ---- BALANCE change (loss / gain tracking) ----
    const balanceEl = document.querySelector(selectors.balanceValue);
    if (balanceEl) {
      let lastBalance = getNumberFromText(balanceEl);

      const balanceObserver = new MutationObserver(() => {
        const current = getNumberFromText(balanceEl);
        if (current !== null && lastBalance !== null && current !== lastBalance) {
          ai.trackEvent({
            name: "BalanceChanged",
            properties: {
              previous: lastBalance,
              current: current,
              delta: current - lastBalance
            }
          });

          lastBalance = current;
        }
      });

      balanceObserver.observe(balanceEl, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }

    // ---- visibility / session end ----
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        ai.trackEvent({ name: "GameHidden" });
      } else {
        ai.trackEvent({ name: "GameVisible" });
      }
    });

    window.addEventListener("beforeunload", () => {
      ai.trackEvent({ name: "GameSessionEnded" });
    });
  });
})();
