// Solo valores publicos. Nunca colocar service_role ni claves privadas.
window.PROMOFLASH_CONFIG = {
  supabaseUrl: 'https://nrwbnjjaqilgreqhpcov.supabase.co',
  // Todas las cuentas nuevas y existentes usan la identidad central de CotizaFlow.
  // Los pagos Pro permanecen desactivados hasta verificar flujos reales de compra.
  accountSupabaseUrl: 'https://nrwbnjjaqilgreqhpcov.supabase.co',
  accountSupabaseAnonKey: 'sb_publishable_7aOw4W695bp3CIMYTO9E6Q_5VChQ6so',
  supabaseAnonKey: 'sb_publishable_7aOw4W695bp3CIMYTO9E6Q_5VChQ6so',
  ga4MeasurementId: '',
  metaPixelId: '2330854091059395',
  plausibleDomain: '',
  proCheckoutUrl: 'https://mpago.la/2iWVYnc',
  proPriceCLP: 4990,
  proBillingInterval: 'month',
  proPaymentsEnabled: false, // Activar solo despues de implementar y verificar la entrega de Pro
  contactEmail: 'soporte@sequeidaulabs.com'
};

// Analítica habilitada por defecto.
// Mantiene intactos la landing, el editor, formularios, estilos y lógica de negocio.
try {
  localStorage.setItem('promoflash_analytics_choice', 'yes');
} catch (e) {}

// Oculta el control antiguo de opt-in/opt-out que todavía crean los scripts existentes.
document.addEventListener('DOMContentLoaded', () => {
  const control = document.getElementById('analyticsPreference');
  if (control) control.remove();
});
