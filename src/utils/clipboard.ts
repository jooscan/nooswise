/**
 * Safe clipboard copy utility that handles iframe permissions,
 * unfocused documents, async click delays, and older browsers gracefully.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text && text !== '') return false;

  // 1. Try modern navigator.clipboard API first
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      if (typeof window !== 'undefined' && window.focus) {
        try {
          window.focus();
        } catch {}
      }
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback silently when document is not focused or inside iframe
    }
  }

  // 2. Reliable fallback using hidden textarea + document.execCommand('copy')
  try {
    if (typeof document === 'undefined') return false;

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';

    document.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    console.warn('Clipboard copy failed:', err);
    return false;
  }
}
