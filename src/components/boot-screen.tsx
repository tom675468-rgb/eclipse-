/** Launch screen shared by the server HTML, session restore and cloud load —
 *  it mirrors the installed-app splash so startup reads as one continuous opening. */
export function BootScreen() {
  return (
    <div className="flex min-h-[100dvh] w-full min-w-0 max-w-full items-center justify-center overflow-hidden bg-background" aria-busy="true" aria-label="Chargement d'Eclipse">
      <img src="/icon-192.png" alt="" width={96} height={96} className="size-24 rounded-[22%] opacity-95" />
    </div>
  );
}
