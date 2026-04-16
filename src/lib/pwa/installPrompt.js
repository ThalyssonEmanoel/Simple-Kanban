let deferredInstallPrompt = null;
const subscribers = new Set();

function notifySubscribers() {
  subscribers.forEach((callback) => {
    try {
      callback(deferredInstallPrompt);
    } catch (error) {
      console.error("[PWA] Erro ao notificar prompt de instalacao:", error);
    }
  });
}

export function setInstallPromptEvent(event) {
  deferredInstallPrompt = event;
  notifySubscribers();
}

export function clearInstallPromptEvent() {
  deferredInstallPrompt = null;
  notifySubscribers();
}

export function getInstallPromptEvent() {
  return deferredInstallPrompt;
}

export function subscribeInstallPromptEvent(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}
