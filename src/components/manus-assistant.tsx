import { useState } from 'react';

import { ManusChatOverlay } from '@/components/manus-chat-overlay';
import { ManusFab } from '@/components/manus-fab';
import { tapFeedback } from '@/lib/haptics';

/**
 * The floating Manus AI entry point: a glowing FAB plus its full-screen chat.
 * Mounted once in the root layout so every screen (auth, tabs, modals) gets it.
 */
export function ManusAssistant() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open ? null : (
        <ManusFab
          onPress={() => {
            tapFeedback();
            setOpen(true);
          }}
        />
      )}
      <ManusChatOverlay visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
