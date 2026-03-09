// Kedua logo UKSW dan FSM berjejer di KANAN ATAS sesuai ajuan skrip
export default function LogoBar() {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-end gap-3">
      <img
        src="/assets/images/logo_uksw.png"
        alt="Logo UKSW"
        className="h-12 object-contain"
        onError={e => { e.target.style.display = 'none' }}
      />
      <img
        src="/assets/images/logo_fsm_uksw.png"
        alt="Logo FSM UKSW"
        className="h-12 object-contain"
        onError={e => { e.target.style.display = 'none' }}
      />
    </div>
  )
}
