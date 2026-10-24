// Replace the concept identity, service menu, and booking destination here.
// A booking URL takes visitors to your live scheduling page. A contact email
// allows visitors to open an appointment request in their own email app.
export const siteConfig = {
  brand: 'NAILS by LISA',
  contactEmail: '',
  bookingUrl: '',
  services: [
    { id: 'signature', name: 'Signature gel', price: 65, duration: 60, category: 'natural', description: 'Nail shaping, cuticle care, and your choice of glossy gel color.' },
    { id: 'builder', name: 'Builder gel overlay', price: 85, duration: 75, category: 'natural', description: 'A structured overlay for natural nails, finished in your signature shade.' },
    { id: 'extensions', name: 'Sculpted extensions', price: 95, duration: 90, category: 'length', description: 'Custom length and silhouette, from a short square to a statement stiletto.' },
    { id: 'gelx', name: 'Gel-X full set', price: 100, duration: 90, category: 'length', description: 'Full-cover soft gel extensions with a single-color finish.' },
    { id: 'art', name: 'Bespoke nail art', price: 120, duration: 120, category: 'length', description: 'A complete custom set with French details, chrome, or hand-painted accents.' },
    { id: 'pedicure', name: 'Gel pedicure', price: 75, duration: 60, category: 'care', description: 'Cuticle care, nail shaping, and a polished gel finish for your toes.' },
    { id: 'refresh', name: 'Builder gel refresh', price: 70, duration: 75, category: 'natural', description: 'Rebalance an existing builder set, refine the shape, and refresh your color.' },
    { id: 'removal', name: 'Removal & reset', price: 30, duration: 30, category: 'care', description: 'Product removal, a gentle shape, and conditioning nail care.' }
  ],
  looks: [
    { id: 'cherry', name: 'Cherry muse', src: './assets/cherry-muse.webp', alt: 'Deep cherry almond manicure with a glossy finish', color: '#651e32' },
    { id: 'pearl', name: 'Pearl French', src: './assets/pearl-french.webp', alt: 'Delicate pearl French manicure on milky pink almond nails', color: '#d5bdb3' },
    { id: 'chrome', name: 'Chrome study', src: './assets/chrome-study.webp', alt: 'Reflective silver chrome almond manicure', color: '#9fa1a1' }
  ]
};
