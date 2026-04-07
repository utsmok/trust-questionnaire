(() => {
  const extensionApi = globalThis.chrome ?? null;
  const MESSAGE_TYPE = 'trust:capture-context';

  if (!extensionApi?.runtime?.onMessage?.addListener) {
    return;
  }

  if (globalThis.__trustCaptureContentScriptInstalled) {
    return;
  }

  globalThis.__trustCaptureContentScriptInstalled = true;

  extensionApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
    void sender;

    if (message?.type !== MESSAGE_TYPE) {
      return undefined;
    }

    const selectionText = globalThis.getSelection?.()?.toString?.().trim?.() ?? '';
    sendResponse({
      url: globalThis.location?.href ?? '',
      title: globalThis.document?.title ?? '',
      selectionText,
      pageLanguage: globalThis.document?.documentElement?.lang ?? '',
    });
    return true;
  });
})();
