import { NavLink } from 'react-router-dom'

const MENU = [
  { to: '/',         label: 'Beranda'  },
  { to: '/panduan',  label: 'Panduan'  },
  { to: '/simulasi', label: 'Simulasi' },
  { to: '/hasil',    label: 'Hasil'    },
]

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 shadow-md" style={{ background: '#1a3a2a' }}>
      <div className="px-4 flex items-center h-11 gap-1">
        {MENU.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              'px-5 py-1.5 text-sm font-semibold rounded transition-colors ' +
              (isActive
                ? 'bg-white text-green-900'
                : 'text-green-100 hover:bg-green-800')
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
