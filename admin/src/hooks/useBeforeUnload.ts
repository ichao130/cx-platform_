import { useEffect } from 'react';

/**
 * isDirty が true のとき、ページ離脱前にブラウザ確認ダイアログを表示する
 */
export function useBeforeUnload(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome では returnValue のセットが必要
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}
