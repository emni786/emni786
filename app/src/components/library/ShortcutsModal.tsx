import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const SHORTCUTS = [
  { keys: ['/'], desc: 'Focus search' },
  { keys: ['j', '↓'], desc: 'Next link' },
  { keys: ['k', '↑'], desc: 'Previous link' },
  { keys: ['o', 'Enter'], desc: 'Open selected' },
  { keys: ['v'], desc: 'Toggle grid / list' },
  { keys: ['Esc'], desc: 'Close detail' },
  { keys: ['?'], desc: 'This help' },
];

export function ShortcutsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.desc} className="flex items-center justify-between text-sm">
              <span>{s.desc}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd key={k} className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
