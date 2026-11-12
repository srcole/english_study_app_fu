export function FuMascot({ happy = false }: { happy?: boolean }) {
  return <svg className="fu-mascot" viewBox="0 0 260 230" fill="none" role="img" aria-label="Master Tofu, a very confident little tofu cube">
    <ellipse cx="133" cy="207" rx="77" ry="10" fill="#283d32" opacity=".09" />
    <path d="M78 156 56 183M180 157l25 22M104 181l-8 25M159 182l10 23" stroke="#283d32" strokeWidth="7" strokeLinecap="round" />
    <path d="m54 180-13-1m15 2-5 12m153-16 12-7m-10 9 10 4" stroke="#283d32" strokeWidth="5" strokeLinecap="round" />
    <path d="m72 68 31-27 90 9 12 25-19 99-100 8-18-27Z" fill="#e5dfc0" stroke="#283d32" strokeWidth="3" strokeLinejoin="round" />
    <path d="m72 68 106 10 15-28-90-9Z" fill="#fffdf0" stroke="#283d32" strokeWidth="3" strokeLinejoin="round" />
    <path d="m72 68 106 10 8 96-100 8-18-27Z" fill="#fffae8" stroke="#283d32" strokeWidth="3" strokeLinejoin="round" />
    <path d="m70 89 109 8 23-17-2 20-19 17L69 108Z" fill="#c0eb76" stroke="#283d32" strokeWidth="3" />
    <path d="m192 98 28 5-14 9 16 10-28-1" fill="#c0eb76" stroke="#283d32" strokeWidth="3" strokeLinejoin="round" />
    <text x="113" y="107" transform="rotate(5 113 107)" fontFamily="Arial,sans-serif" fontSize="14" fontWeight="900" fill="#283d32">FU</text>
    {happy ? <><path d="m95 132 7-5 6 5m38 3 7-5 6 5" stroke="#283d32" strokeWidth="4" strokeLinecap="round" /><path d="M115 148q13 23 26 1Z" fill="#283d32" /></> : <><ellipse cx="102" cy="132" rx="4" ry="6" fill="#283d32" /><ellipse cx="153" cy="136" rx="4" ry="6" fill="#283d32" /><path d="M117 148q10 10 20 1" stroke="#283d32" strokeWidth="3" strokeLinecap="round" /></>}
    <ellipse cx="91" cy="145" rx="9" ry="4" fill="#f5b3a1" /><ellipse cx="163" cy="149" rx="9" ry="4" fill="#f5b3a1" />
    <path d="m34 64 4-12 4 12 12 4-12 4-4 12-4-12-12-4Zm179-30 3-9 3 9 9 3-9 3-3 9-3-9-9-3Z" fill="#9ab663" />
  </svg>;
}
