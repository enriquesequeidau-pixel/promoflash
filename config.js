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

// El usuario elige explícitamente la medición opcional desde el pie de página.
// Sin preferencia guardada, Meta Pixel / GA4 / Plausible y eventos de analítica
// permanecen desactivados. El editor gratuito y el formulario siguen funcionando.
// No borrar ni sobrescribir una preferencia previamente elegida.
