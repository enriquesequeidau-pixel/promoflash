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
  // PromoFlash sells in Mexico. The former Chilean checkout is not valid for this market.
  proCheckoutUrl: '',
  proTargetCountry: 'MX',
  proTargetCurrency: 'MXN',
  proPriceCLP: null,
  proBillingInterval: 'month',
  proPaymentsEnabled: false, // Activar solo despues de implementar y verificar la entrega de Pro
  contactEmail: 'soporte@sequeidaulabs.com'
};

// Las estadísticas requieren consentimiento explícito. landing.js controla la preferencia.
